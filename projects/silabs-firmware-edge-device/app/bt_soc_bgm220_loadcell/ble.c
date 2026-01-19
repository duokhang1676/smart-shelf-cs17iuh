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
#include "ble.h"
#include "app_assert.h"
#include "gatt_db.h"
#include "hx711.h"
#include "app.h"
#include "sl_iostream.h"
#include "timer_control.h"
#include <stdio.h>

uint8_t connection_handle = 0xff;
static uint8_t advertising_set_handle = 0xff;

void ble_init(void)
{
    sl_status_t sc;

    // Create advertiser set
    sc = sl_bt_advertiser_create_set(&advertising_set_handle);
    app_assert_status(sc);

    // Create advertising data
    sc = sl_bt_legacy_advertiser_generate_data(advertising_set_handle,
                                               sl_bt_advertiser_general_discoverable);
    app_assert_status(sc);

    // Set advertising timing (100ms)
    sc = sl_bt_advertiser_set_timing(advertising_set_handle,
                                     160, 160, 0, 0);
    app_assert_status(sc);

    // Start advertising
    sc = sl_bt_legacy_advertiser_start(advertising_set_handle,
                                       sl_bt_legacy_advertiser_connectable);
    app_assert_status(sc);

    printf("BLE: Advertising started\n");
}

void ble_notify_loadcell(uint8_t *data, uint8_t length)
{
    if (connection_handle != 0xff) {
        sl_bt_gatt_server_send_notification(
            connection_handle,
            gattdb_loadcell_characteristic,
            length,
            data
        );
    }
}

void ble_process_event(sl_bt_msg_t *evt)
{
    sl_status_t sc;

    switch (SL_BT_MSG_ID(evt->header)) {
        case sl_bt_evt_system_boot_id:
            ble_init();
            break;

        case sl_bt_evt_connection_opened_id:
            connection_handle = evt->data.evt_connection_opened.connection;
            printf("BLE: Connection opened (handle = %d)\n", connection_handle);
            // Sound for connection opened
            trigger_gpio_high_nonblocking(100);
            sl_sleeptimer_delay_millisecond(200);
            trigger_gpio_high_nonblocking(100);
            // Fix: set connection parameters
            sl_bt_connection_set_parameters(connection_handle,
                                            40,   // min interval (50ms)
                                            80,   // max interval (100ms)
                                            0,    // latency
                                            400,  // timeout (4s)
                                            0,    // min CE length
                                            0);   // max CE length
            break;

        case sl_bt_evt_gatt_server_characteristic_status_id:
        {
            sl_bt_evt_gatt_server_characteristic_status_t *status_evt =
                &evt->data.evt_gatt_server_characteristic_status;

            if (status_evt->status_flags == sl_bt_gatt_server_client_config &&
                status_evt->characteristic == gattdb_loadcell_characteristic &&
                status_evt->client_config_flags == sl_bt_gatt_notification) {

                sl_sleeptimer_delay_millisecond(500);

                ble_notify_loadcell(last_quantity, LOADCELL_NUM);
                printf("BLE notify sent!\n");
            }
        }
        break;

        case sl_bt_evt_connection_closed_id:;
            printf("BLE: Connection closed (reason=0x%02X)\n",
                   evt->data.evt_connection_closed.reason);
            connection_handle = 0xff;
            // Sound for connection closed
            trigger_gpio_high_nonblocking(100);
            sl_sleeptimer_delay_millisecond(200);
            trigger_gpio_high_nonblocking(100);
            sl_sleeptimer_delay_millisecond(200);
            trigger_gpio_high_nonblocking(100);

            // Start advertising
            sc = sl_bt_legacy_advertiser_start(advertising_set_handle,
                                               sl_bt_legacy_advertiser_connectable);
            app_assert_status(sc);

            printf("BLE: Advertising started\n");
            break;

        case sl_bt_evt_gatt_server_user_write_request_id:
        {
            uint8_t char_id = evt->data.evt_gatt_server_user_write_request.characteristic;
            uint8_t *data = evt->data.evt_gatt_server_user_write_request.value.data;
            uint16_t length = evt->data.evt_gatt_server_user_write_request.value.len;

            if (char_id == gattdb_rx_characteristic) {
                printf("BLE: Received weight_of_one data: ");
                for (int i = 0; i < LOADCELL_NUM; i++) {
                    printf("%d ", data[i]);
                    weight_of_one[i] = (data[i] * 3) + 2;
                }
                save_array_to_nvm3(WEIGHT_OF_ONE_ARRAY_KEY, weight_of_one, sizeof(weight_of_one[0]), LOADCELL_NUM);
                printf("\n");
            }

            if (char_id == gattdb_verified_quantity_characteristic) {
                printf("BLE: Received verified_quantity data: ");
                for (int i = 0; i < length; i++) {
                    printf("%d ", data[i]);
                    if( data[i] == 1){
                      printf("Adding products!\n");
                      adding_products = true;
                      trigger_gpio_high_nonblocking(100);
                      sl_sleeptimer_delay_millisecond(200);
                      trigger_gpio_high_nonblocking(500);
                    }else{
                      printf("Added products!\n");
                      trigger_gpio_high_nonblocking(100);
                      sl_sleeptimer_delay_millisecond(200);
                      trigger_gpio_high_nonblocking(100);
                      sl_sleeptimer_delay_millisecond(200);
                      trigger_gpio_high_nonblocking(500);
                      for(int i = 0; i<LOADCELL_NUM; i++){
                          if (last_quantity[i] < 200){
                            if (verified_quantity[i] != last_quantity[i]){
                              verified_quantity[i] = last_quantity[i];
                            }
                          }
                      }
                      adding_products = false;
                      save_array_to_nvm3(VERIFIED_QUANTITY_ARRAY_KEY, verified_quantity, sizeof(verified_quantity[0]), LOADCELL_NUM);
                      changed = true;
                    }
                }
                printf("\n");
            }

            if (char_id == gattdb_product_name_characteristic) {
                printf("BLE: Received product name data: ");
                char buffer[200];
                for (int i = 0; i < length; i++) {
                    buffer[i] = (char)data[i];
                }
                buffer[length] = '\0';
                printf("Buffer = %s\n", buffer);
                char *token = strtok(buffer, ";");
                int idx = 0;
                while (token != NULL && idx < LOADCELL_NUM) {
                    strncpy(product_name[idx], token, sizeof(product_name[idx]) - 1);
                    product_name[idx][sizeof(product_name[idx]) - 1] = '\0'; 
                    token = strtok(NULL, ";");
                    idx++;
                }
                for (int j = 0; j < LOADCELL_NUM; j++) {
                    printf("product_name[%d] = %s\n", j, product_name[j]);
                }
                save_array_to_nvm3(PRODUCT_NAME_ARRAY_KEY, product_name, sizeof(product_name[0]), LOADCELL_NUM);
                printf("\n");
            }

            if (char_id == gattdb_product_price_characteristic) {
                printf("BLE: Received product price data: ");
                for (int i = 0; i < LOADCELL_NUM; i++) {
                    printf("%d ", data[i]);
                    product_price[i] = data[i] * 1000;
                }
                save_array_to_nvm3(PRODUCT_PRICE_ARRAY_KEY, product_price, sizeof(product_price[0]), LOADCELL_NUM);
                printf("\n");
                lcd_show();
            }

            // Send response for confirmation
            sl_bt_gatt_server_send_user_write_response(
                evt->data.evt_gatt_server_user_write_request.connection,
                char_id,
                SL_STATUS_OK
            );
            break;
        }

        default:
            break;
    }
}
