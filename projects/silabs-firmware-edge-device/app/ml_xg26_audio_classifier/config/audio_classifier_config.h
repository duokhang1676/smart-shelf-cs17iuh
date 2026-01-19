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

#ifndef AUDIO_CLASSIFIER_CONFIG_H
#define AUDIO_CLASSIFIER_CONFIG_H

#if __has_include("sl_tflite_micro_model_parameters.h")
  #include "sl_tflite_micro_model_parameters.h"
#endif

// Audio Classification configuration
#if defined(SL_TFLITE_MODEL_AVERAGE_WINDOW_DURATION_MS)
  #define SMOOTHING_WINDOW_DURATION_MS SL_TFLITE_MODEL_AVERAGE_WINDOW_DURATION_MS
#else
  #define SMOOTHING_WINDOW_DURATION_MS 800
#endif

#if defined(SL_TFLITE_MODEL_MINIMUM_COUNT)
  #define MINIMUM_DETECTION_COUNT SL_TFLITE_MODEL_MINIMUM_COUNT
#else
  #define MINIMUM_DETECTION_COUNT 2
#endif

#if defined(SL_TFLITE_MODEL_DETECTION_THRESHOLD)
  #define DETECTION_THRESHOLD SL_TFLITE_MODEL_DETECTION_THRESHOLD
#else
  #define DETECTION_THRESHOLD 230
#endif

#if defined(SL_TFLITE_MODEL_SUPPRESSION_MS)
  #define SUPPRESSION_TIME_MS SL_TFLITE_MODEL_SUPPRESSION_MS
#else
  #define SUPPRESSION_TIME_MS 2000
#endif

#define SENSITIVITY .7f
#define IGNORE_UNDERSCORE_LABELS 1
/*
 * un-command if you want to print audio score of each label while loop
 */
//#define VERBOSE_MODEL_OUTPUT_LOGS 0
#define INFERENCE_INTERVAL_MS 100
#define MAX_CATEGORY_COUNT 4
#define MAX_RESULT_COUNT 100
#define TASK_STACK_SIZE 512
#define TASK_PRIORITY 20

#if defined(SL_TFLITE_MODEL_CLASSES)
  #define CATEGORY_LABELS SL_TFLITE_MODEL_CLASSES
#else
  #define CATEGORY_LABELS {"pay", "discount", "combo", "unknown"}
#endif

#endif // AUDIO_CLASSIFIER_CONFIG_Hs
