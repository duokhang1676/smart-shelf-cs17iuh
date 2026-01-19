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
#ifndef APP_H
#define APP_H

#include <stdbool.h>
#include "hx711.h"

// Key in NVM3, within range NVM3_KEY_MIN -> NVM3_KEY_MAX
#define OFFSET_ARRAY_KEY  0x10001
#define SCALE_ARRAY_KEY  0x10002
#define WEIGHT_OF_ONE_ARRAY_KEY  0x10003
#define VERIFIED_QUANTITY_ARRAY_KEY  0x10004
#define PRODUCT_NAME_ARRAY_KEY  0x10005
#define PRODUCT_PRICE_ARRAY_KEY 0x10006

extern int weight_of_one[LOADCELL_NUM];

extern int8_t verified_quantity[LOADCELL_NUM];

extern uint8_t last_quantity[LOADCELL_NUM];

extern char product_name[LOADCELL_NUM][20];

extern int product_price[LOADCELL_NUM];

extern bool adding_products;

extern int scale_weight;

extern bool changed;

/**************************************************************************//**
 * Application Init.
 *****************************************************************************/
void app_init(void);

/**************************************************************************//**
 * Initialize Runtime Environment.
 *****************************************************************************/
void app_init_runtime(void);

/**************************************************************************//**
 * Application Process Action.
 *****************************************************************************/
void app_process_action(void);

/**************************************************************************//**
 * Proceed with execution. (Indicate that it is required to run the application
 * process action.)
 *****************************************************************************/
void app_proceed(void);

/**************************************************************************//**
 * Check if it is required to process with execution.
 * @return true if required, false otherwise.
 *****************************************************************************/
bool app_is_process_required(void);

#endif // APP_H
