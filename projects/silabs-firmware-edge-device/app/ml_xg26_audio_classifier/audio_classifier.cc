/**
* Copyright 2025 Quoc Tinh [C]
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*     http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
**/

#include "os.h"
#include "sl_power_manager.h"
#include "sl_status.h"
#include "sl_tflite_micro_model.h"
#include "sl_tflite_micro_init.h"
#include "sl_ml_audio_feature_generation.h"
#include "sl_sleeptimer.h"
#include "tensorflow/lite/micro/micro_interpreter.h"
#include "tensorflow/lite/c/common.h"

#include <cstdio>

#include "recognize_commands.h"
#include "config/audio_classifier_config.h"
#include "audio_classifier.h"

#define NUM_LABELS            4
#define TASK_STACK_SIZE       512
#define TASK_PRIORITY         20
#define INFERENCE_INTERVAL_MS 100

#define IDLE_TIMEOUT_MS 1000

// Smoothing & suppression
static const int32_t  kAvgWindowMs  = 800;
static const uint8_t  kDetectThr    = 230;
static const int32_t  kSuppressMs   = 2000;
static const int32_t  kMinCount     = 2;
static const bool     kIgnoreUnderscore = true;

static const char* category_labels[] = {"pay", "discount", "combo", "unknown"};
static int category_label_count = sizeof(category_labels) / sizeof(category_labels[0]);

static RecognizeCommands* command_recognizer = nullptr;

static OS_TCB   kws_task_tcb;
static CPU_STK  kws_task_stack[TASK_STACK_SIZE];

static void keyword_spotting_task(void *arg);
static sl_status_t run_inference();
static sl_status_t process_output();

const char* get_category_label(int index)
{
  if (index >= 0 && index < category_label_count) {
    return category_labels[index];
  }
  return "?";
}

extern "C" void audio_classifier_init(void)
{
  RTOS_ERR err;

  if (sl_ml_audio_feature_generation_init() != SL_STATUS_OK) {
    printf("ERROR: Audio Feature Generation init failed!\n");
    while (1) ;
  }
  int feature_size = sl_ml_audio_feature_generation_get_feature_buffer_size();

  static RecognizeCommands static_recognizer(sl_tflite_micro_get_error_reporter(),
                                             kAvgWindowMs,
                                             kDetectThr,
                                             kSuppressMs,
                                             kMinCount,
                                             kIgnoreUnderscore);
  command_recognizer = &static_recognizer;

  tflite::MicroInterpreter* interpreter = sl_tflite_micro_get_interpreter();
  if (!interpreter) {
    printf("ERROR: Failed to get TFLite interpreter\n");
    while (1) ;
  }
  // Validate tensor shape
  const TfLiteTensor* input  = interpreter->input(0);
  const TfLiteTensor* output = interpreter->output(0);

  sl_power_manager_add_em_requirement(SL_POWER_MANAGER_EM1);
  char task_name[] = "keyword spotting task";
  OSTaskCreate(&kws_task_tcb,
               task_name,
               keyword_spotting_task,
               DEF_NULL,
               TASK_PRIORITY,
               &kws_task_stack[0],
               (TASK_STACK_SIZE / 10u),
               TASK_STACK_SIZE,
               0u,
               0u,
               DEF_NULL,
               (OS_OPT_TASK_STK_CLR),
               &err);
  EFM_ASSERT((RTOS_ERR_CODE_GET(err) == RTOS_ERR_NONE));
}

/***************************************************************************//**
 * Keyword spotting task function
 ******************************************************************************/
static void keyword_spotting_task(void *arg)
{
  (void)arg;
  RTOS_ERR err;

  while (1) {
    // Inference loop
    OSTimeDlyHMSM(0, 0, 0, INFERENCE_INTERVAL_MS, OS_OPT_TIME_PERIODIC, &err);
    EFM_ASSERT((RTOS_ERR_CODE_GET(err) == RTOS_ERR_NONE));

    // Update feature
    sl_status_t status = sl_ml_audio_feature_generation_update_features();
    if (status != SL_STATUS_OK) {
      if (status == SL_STATUS_EMPTY) {
          /*
           * Debug
           */
      } else {
          /*
           * Debug
           */
      }
      continue;
    }

    // Inference + output process
    if (run_inference() != SL_STATUS_OK) continue;
    if (process_output() != SL_STATUS_OK) continue;
  }
}
/***************************************************************************//**
 * Run model inference
 ******************************************************************************/
static sl_status_t run_inference()
{
  TfLiteTensor* input_tensor = sl_tflite_micro_get_input_tensor();
  if (!input_tensor) {
    printf("ERROR: Input tensor is null\n");
    return SL_STATUS_FAIL;
  }

  sl_status_t status = sl_ml_audio_feature_generation_fill_tensor(input_tensor);
  if (status != SL_STATUS_OK) {
    printf("Fill tensor failed: 0x%lx\n", status);
    return SL_STATUS_FAIL;
  }

  if (input_tensor->type != kTfLiteInt8) {
    printf("ERROR: Input tensor type mismatch, expected %d, got %d\n", kTfLiteInt8, input_tensor->type);
    return SL_STATUS_FAIL;
  }

  tflite::MicroInterpreter* interpreter = sl_tflite_micro_get_interpreter();
  TfLiteStatus invoke_status = interpreter->Invoke();
  if (invoke_status != kTfLiteOk) {
    printf("Model inference failed with status: %d\n", invoke_status);
    return SL_STATUS_FAIL;
  }
  return SL_STATUS_OK;
}
/***************************************************************************//**
 * Process output
 ******************************************************************************/
static sl_status_t process_output()
{
  uint32_t now_ms = sl_sleeptimer_tick_to_ms(sl_sleeptimer_get_tick_count());

  TfLiteTensor* output_tensor = sl_tflite_micro_get_output_tensor();
  if (!output_tensor) return SL_STATUS_FAIL;
  if (output_tensor->type != kTfLiteInt8) return SL_STATUS_FAIL;

  uint8_t found_index = 0;
  uint8_t score = 0;
  bool is_new_command = false;

  TfLiteStatus reco_status = command_recognizer->ProcessLatestResults(
      output_tensor, now_ms, &found_index, &score, &is_new_command);
  if (reco_status != kTfLiteOk) return SL_STATUS_FAIL;

  const char* label = get_category_label(found_index);

  // -------- Idle suppression -----------
  static const char* last_label = "";
  static uint32_t last_change_ms = 0;

  if (is_new_command) {
    if (strcmp(label, last_label) != 0) {
      printf("%s\n", label);
      last_label = label;
      last_change_ms = now_ms;
    }
  } else {
    if ((now_ms - last_change_ms) > IDLE_TIMEOUT_MS) {
      /*
       * print idle if need
       */
    }
  }

  return SL_STATUS_OK;
}
