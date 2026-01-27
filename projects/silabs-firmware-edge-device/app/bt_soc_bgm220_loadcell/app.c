/*******************************************************************************
* Copyright 2025 Vo Duong Khang [C]
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
*******************************************************************************/
#include <nvm3.h>
#include <lcd_i2c.h>
#include <stdio.h>
#include <string.h>
#include "sl_sleeptimer.h"
#include "sl_i2cspm_instances.h"
#include "sl_i2cspm.h"
#include "app.h"
#include "hx711.h"
#include "ble.h"
#include "timer_control.h"
#include "nvm3_utils.h"
#include "nvm3_default.h"
#include "nvm3_default_config.h"
#include "ecode.h"
#include "em_i2c.h"

extern sl_i2cspm_t *sl_i2cspm_mikroe;

// Define BUTTON_0_PIN
#define BUTTON_PORT gpioPortC
#define BUTTON_PIN  7


/*************** Setup global variable ***************/
// loadcell information
int32_t offset[LOADCELL_NUM] = {0};
int scale[LOADCELL_NUM] = {400};
int scale_weight = 525; // use Dasani 510ml to set scale

// error threshold

int error_threshold_weight_percent = 20; // weight can error 10%

int loadcell_timeout_delay_threshold = 5;
int error_weight_delay_threshold = 5;

// delay counter
int loadcell_timeout_delay[LOADCELL_NUM] = {0};
int error_weight_delay[LOADCELL_NUM] = {0};

// product information
int weight_of_one[LOADCELL_NUM] = {515};
char product_name[LOADCELL_NUM][20] = {"NONE"};
int product_price[LOADCELL_NUM] = {0};

int8_t verified_quantity[LOADCELL_NUM] = {0};

uint8_t last_quantity[LOADCELL_NUM] = {0}; // Save last loadcell value

bool adding_products = false; // Check adding product state

int time_count = 0; // Count to reset offset every time

bool changed = false; // Check quantity and last quantity change state
bool error_weight_flag[LOADCELL_NUM] = {false}; // Track error state for each loadcell
uint8_t last_error_code[LOADCELL_NUM] = {0}; // Track last error code for each loadcell


/*************** FUNCTION ***************/

/******** Event BLE Handle ********/
void sl_bt_on_event(sl_bt_msg_t *evt)
{
  ble_process_event(evt);
}

///******** NVM3 Utils ********/
Ecode_t save_array_to_nvm3(uint32_t key, const void *array, size_t element_size, size_t length)
{
  size_t total_size = element_size * length;
  if (total_size > NVM3_DEFAULT_MAX_OBJECT_SIZE) {
    return ECODE_NVM3_ERR_ALIGNMENT_INVALID;
  }
  return nvm3_writeData(nvm3_defaultHandle, key, (const uint8_t *)array, total_size);
}

Ecode_t load_array_from_nvm3(uint32_t key, void *array, size_t element_size, size_t max_length, size_t *actual_length)
{
  int type;
  size_t len;
  Ecode_t err;

  err = nvm3_getObjectInfo(nvm3_defaultHandle, key, &type, &len);
  if (err != ECODE_NVM3_OK || type != NVM3_OBJECTTYPE_DATA) {
    return err;
  }

  size_t count = len / element_size;
  if (count > max_length) {
    return ECODE_NVM3_ERR_ALIGNMENT_INVALID;
  }

  err = nvm3_readData(nvm3_defaultHandle, key, (uint8_t *)array, len);
  if (err == ECODE_NVM3_OK && actual_length != NULL) {
    *actual_length = count;
  }

  return err;
}
/******** Config loadcell ********/
void set_offset(void){
  printf("Setup offset\n");
  for (int i = 0; i < LOADCELL_NUM; i++) {
     if(last_quantity[i]==255){//flag
         printf("Loadcell %d is not available!\n",i+1);
         continue;
     }
     CORE_DECLARE_IRQ_STATE;
     CORE_ENTER_CRITICAL();
     int32_t raw = hx711_read(&hx711_sensors[i]);
     if (raw < 0)
       raw = - raw;
     printf("Offset %d: %ld\n",i+1, raw);
     CORE_EXIT_CRITICAL();

     offset[i] = raw;
   }
    save_array_to_nvm3(OFFSET_ARRAY_KEY, offset, sizeof(offset[0]), LOADCELL_NUM);
}

void set_scale_array(){
  printf("Setup scale\n");
  for (int i = 0; i < LOADCELL_NUM; i++) {
      if(last_quantity[i]==255){
          printf("Loadcell %d is not available!\n",i+1);
          continue;
      }
      CORE_DECLARE_IRQ_STATE;
      CORE_ENTER_CRITICAL();
      int32_t raw = hx711_read(&hx711_sensors[i]);
      if(raw < 0)
        raw = - raw;
      CORE_EXIT_CRITICAL();
      scale[i] = (raw - offset[i]) / scale_weight;

      printf("Scale %d: %d\n",i+1, scale[i]);
    }
    save_array_to_nvm3(SCALE_ARRAY_KEY, scale, sizeof(scale[0]), LOADCELL_NUM);
}

bool check_event_set_offset(){
  int hold_counter = 0;
  while((GPIO_PinInGet(BUTTON_PORT, BUTTON_PIN) == 0)){
      hold_counter++;
      sl_sleeptimer_delay_millisecond(1000);
      if (hold_counter == 3 ){
          printf("Button held for 3 seconds!\n");
          if (is_trigger_done()) {
              trigger_gpio_high_nonblocking(300);
          }
          set_offset();
          return true;
      }
  }
  return false;
}

void check_loadcell_pin(){
  printf("Check loadcell pin!\n");
  for (int i = 0; i < LOADCELL_NUM; i++) {
      if (is_floating_pin(hx711_sensors[i].data_port, hx711_sensors[i].data_pin)) {
          printf("Loadcell %d floating -> ignored -> Offset %d: %ld - Scale: %d - Weight of one: %d - Verified quantity: %d\n", i + 1,i+1, offset[i], scale[i], weight_of_one[i], verified_quantity[i]);
          last_quantity[i] = 255;
      }else
        printf("Offset %d: %ld - Scale: %d - Weight of one: %d - Verified quantity: %d\n",i+1, offset[i], scale[i], weight_of_one[i], verified_quantity[i]);
    }
}


uint8_t i2c_scan(void)
{
    I2C_TransferSeq_TypeDef seq;
    uint8_t dummy[1];
    I2C_TransferReturn_TypeDef ret;

    printf("Scanning I2C bus...\r\n");

    for (uint8_t addr = 1; addr < 127; addr++) {
        seq.addr = addr << 1;
        seq.flags = I2C_FLAG_WRITE;
        seq.buf[0].data = dummy;
        seq.buf[0].len = 0;
        seq.buf[1].len = 0;

        ret = I2CSPM_Transfer(sl_i2cspm_mikroe, &seq);

        if (ret == i2cTransferDone) {
            printf("Found device at 0x%02X\r\n", addr);
            return addr;
        }
    }
}

void format_number_with_commas(int num, char *buf, size_t buf_size) {
    char temp[32];
    snprintf(temp, sizeof(temp), "%d", num);

    int len = strlen(temp);
    int commas = (len - 1) / 3;
    int new_len = len + commas;

    if (new_len + 1 > buf_size) {
        snprintf(buf, buf_size, "BUFFER TOO SMALL");
        return;
    }

    buf[new_len] = '\0';

    int i = len - 1;
    int j = new_len - 1;
    int count = 0;

    while (i >= 0) {
        buf[j--] = temp[i--];
        count++;
        if (count == 3 && i >= 0) {
            buf[j--] = ',';
            count = 0;
        }
    }
}


#define LCD_WIDTH 16

void lcd_print_centered(uint8_t row, const char *text) {
    int len = strlen(text);
    if (len > LCD_WIDTH) len = LCD_WIDTH;

    int padding = (LCD_WIDTH - len) / 2;

    lcd_set_cursor(padding, row);
    for (int i = 0; i < len; i++) {
        lcd_write_char(text[i]);
    }
}

void lcd_show(){
  uint8_t pca_addr = i2c_scan();
  
  // Reset PCA9548A trước khi sử dụng để đảm bảo trạng thái sạch
  pca9548a_reset(pca_addr);
  printf("PCA9548A reset completed at address 0x%02X\n", pca_addr);
  printf("Starting LCD initialization and display...\n");
  
  // Khởi tạo và hiển thị dữ liệu cho từng LCD
  for (uint8_t i = 0; i < LOADCELL_NUM; i++) {
      printf("[LCD %d] Selecting channel %d...\n", i, i);
      
      // Chọn kênh cho LCD thứ i
      lcd_select_channel(pca_addr, i);
      
      printf("[LCD %d] Initializing...\n", i);
      lcd_init();
      lcd_clear();
      
      printf("[LCD %d] Displaying: %s - %d\n", i, product_name[i], product_price[i]);
      
      // Hiển thị tên sản phẩm
      lcd_print_centered(0, product_name[i]);

      // Hiển thị giá
      char buffer[20];
      format_number_with_commas(product_price[i], buffer, sizeof(buffer));
      strcat(buffer, "d");
      lcd_print_centered(1, buffer);
      
      printf("[LCD %d] Done!\n", i);
      sl_sleeptimer_delay_millisecond(200); // Delay giữa mỗi LCD
  }
  
  // Tắt tất cả kênh sau khi hoàn thành
  pca9548a_reset(pca_addr);
  printf("All LCDs initialized and updated successfully!\n");
}
// === Init function ===
SL_WEAK void app_init(void)
{
  printf("========== START ==========\n");
  hx711_gpio_init();

  timer_control_init();
  if (is_trigger_done()) {
      trigger_gpio_high_nonblocking(300);
  }
  // Load data from NVM3
  size_t actual_length = LOADCELL_NUM;
  load_array_from_nvm3(OFFSET_ARRAY_KEY, offset, sizeof(offset[0]),LOADCELL_NUM, &actual_length);
  load_array_from_nvm3(SCALE_ARRAY_KEY, scale, sizeof(scale[0]), LOADCELL_NUM, &actual_length);
  load_array_from_nvm3(WEIGHT_OF_ONE_ARRAY_KEY, weight_of_one, sizeof(weight_of_one[0]), LOADCELL_NUM, &actual_length);
  load_array_from_nvm3(VERIFIED_QUANTITY_ARRAY_KEY, verified_quantity, sizeof(verified_quantity[0]), LOADCELL_NUM, &actual_length);

  load_array_from_nvm3(PRODUCT_NAME_ARRAY_KEY, product_name, sizeof(product_name[0]), LOADCELL_NUM, &actual_length);
  load_array_from_nvm3(PRODUCT_PRICE_ARRAY_KEY, product_price, sizeof(product_price[0]), LOADCELL_NUM, &actual_length);

  // Check loadcell pin available
  check_loadcell_pin();

// debug fix loadcell
  last_quantity[1] = 255;
  last_quantity[5] = 255;

  GPIO_PinModeSet(BUTTON_PORT, BUTTON_PIN, gpioModeInputPullFilter, 1);
  // check button_0 pressed to config offset and scale
  bool is_pressed = (GPIO_PinInGet(BUTTON_PORT, BUTTON_PIN) == 0);

  // start config
  if (is_pressed) {
      // if not config offset => config scale
      if(!check_event_set_offset()){
        printf("Button held for < 3 seconds!\n");
        if (is_trigger_done()) {
            trigger_gpio_high_nonblocking(100);
        }
        sl_sleeptimer_delay_millisecond(500);
        if (is_trigger_done()) {
            trigger_gpio_high_nonblocking(100);
        }
        set_scale_array();
      }
  }

  lcd_show();
  printf("===========================\n");
}

// === Main loop ===
SL_WEAK void app_process_action(void)
{
  bool error_weight_flag[LOADCELL_NUM] = {false};
  bool changed_index[LOADCELL_NUM] = {false}; // Track which loadcell changed
  char buffer[512];
  time_count++;

  for (int i = 0; i < LOADCELL_NUM; i++) {
      if(last_quantity[i] == 255) // loadcell not working from the kit start
        continue;

      CORE_DECLARE_IRQ_STATE;
      CORE_ENTER_CRITICAL();  // Disable interrupts
      int32_t raw = hx711_read(&hx711_sensors[i]);
      if(raw<0)
        raw = - raw;
      CORE_EXIT_CRITICAL();   // Re-enable interrupts

    if (raw == 0 || raw == 1) { // delay for timeout
      printf("Loadcell %d isn't ready (timeout): raw = %ld\n", i + 1,raw);
      loadcell_timeout_delay[i]++;
      if(loadcell_timeout_delay[i] >= loadcell_timeout_delay_threshold){
          last_quantity[i] = 255; // error flag
          changed = true;
          error_weight_flag[i] = true;
      }
      continue;
    }
    loadcell_timeout_delay[i] = 0;

    int weight = (raw - offset[i]) / scale[i];

    // No distinction direction loadcell
    if (weight < 0)
      weight = - weight;

    uint32_t raw_change = raw - offset[i];

    uint8_t quantity = 0;

    // Check quantity // flag
    int error_weight = 5 + ((weight_of_one[i] * error_threshold_weight_percent) / 100);
    int remainder = weight % weight_of_one[i];

    if(adding_products){
        // Adding products
        quantity = (weight+error_weight)/weight_of_one[i];

        printf("loadcell %d: %d - weight: %d - ", i+1, quantity,weight);
        printf("(weight+error_weight): %d\n", (weight+error_weight));

    }else{
        if (weight > (verified_quantity[i] * weight_of_one[i] + error_weight)){
            // Invalid ( weight > real weight)
            uint8_t current_error_code = 200;
            if (last_error_code[i] != current_error_code) {
                // Error type changed, reset counter
                error_weight_delay[i] = 0;
                last_error_code[i] = current_error_code;
            }
            error_weight_delay[i]++;
            quantity = last_quantity[i];
            if(error_weight_delay[i] >= error_weight_delay_threshold){
                printf("Weight %d invalid! (> real weight): %d > %d\n", i+1, weight, verified_quantity[i]*weight_of_one[i]);
                quantity = 200;
                error_weight_flag[i] = true;
            }
        }else{
              if (remainder <= error_weight || remainder >= (weight_of_one[i] - error_weight)){
                    if(weight>0)
                    quantity = (weight+error_weight)/weight_of_one[i];
                    // Valid
                    printf("Weight %d valid!, Weight: %d ,Quantity: %d\n", i+1, weight, quantity);
                    error_weight_delay[i] = 0;
                    last_error_code[i] = 0; // Reset error code


//                  Fix offset feature
//                    if(time_count % 60 == 0){

//                        int error_weight_overtime = (quantity * weight_of_one[i]) - weight;
//                        int offset_change = error_weight_overtime * scale[i];
//                        offset[i] = offset[i] - offset_change;
//                    }

                }else{
                    // Invalid (weight outlier)
                    uint8_t current_error_code = 222;
                    if (last_error_code[i] != current_error_code) {
                        // Error type changed, reset counter
                        error_weight_delay[i] = 0;
                        last_error_code[i] = current_error_code;
                    }
                    error_weight_delay[i]++;
                    quantity = last_quantity[i];
                    if(error_weight_delay[i] >= error_weight_delay_threshold){
                        printf("Weight %d invalid! (outlier): %d > %d or %d < %d\n",i+1,remainder,error_weight,remainder,(weight_of_one[i] - error_weight));
                        quantity = 222;
                        error_weight_flag[i] = true;
                    }
                }
          }
    }

    int taken = verified_quantity[i] - quantity;
    if (quantity != last_quantity[i]) {
      last_quantity[i] = quantity;
      changed = true;
      changed_index[i] = true; // Mark this loadcell as changed
    }

//    Debug
//    sprintf(buffer,
//            "Loadcell %d offset: %ld, raw: %ld, weight_total: %d, weight_of_one %d, verified_quantity: %d\nQuantity: %d, taken: %d, raw_change: %ld, error_weight: %d\n\n",
//            i + 1, offset[i], raw, weight, weight_of_one[i], verified_quantity[i], last_quantity[i], taken, raw_change, remainder);
//    printf("%s", buffer);
  }

  uint64_t ticks = sl_sleeptimer_get_tick_count64(); // Get the number of ticks on startup
  uint32_t freq = sl_sleeptimer_get_timer_frequency(); // tick frequency (Hz)
  uint32_t elapsed_minutes = (ticks / freq) / 60;
  printf("-------------------------\n");
  printf("Elapsed time: %lu minutes\n", (unsigned long)elapsed_minutes);

//  if(time_count % 60 == 0){
//      save_array_to_nvm3(OFFSET_ARRAY_KEY, offset, sizeof(offset[0]), LOADCELL_NUM);
//      printf("update offset\n");
//  }


  // === Quantity changed === //
  if (changed){
      changed = false;
      if (is_trigger_done()) {
          // Check if any loadcell with error has changed its quantity
          bool error_changed = false;
          for (int i = 0; i < LOADCELL_NUM; i++) {
              if (error_weight_flag[i] && changed_index[i]) {
                  error_changed = true;
                  break;
              }
          }
          
          if (error_changed){
              trigger_gpio_high_nonblocking(500);
          }else{
              trigger_gpio_high_nonblocking(100);
          }
      }

    if (connection_handle != 0xff) {
        ble_notify_loadcell(last_quantity, LOADCELL_NUM);
        printf("Sent BLE notify:[ %d", last_quantity[0]);
        for(int i=1; i<LOADCELL_NUM;i++){
            printf(", %d", last_quantity[i]);
        }
        printf(" ]\n");
      }
  }
  sl_sleeptimer_delay_millisecond(1000);
}
