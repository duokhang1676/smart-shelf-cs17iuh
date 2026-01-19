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
#ifndef HX711_H
#define HX711_H

#include "em_gpio.h"
#include <stdbool.h>
#include <stdint.h>

#define LOADCELL_NUM 8

typedef struct {
  GPIO_Port_TypeDef data_port;
  uint8_t data_pin;
} HX711_t;

extern HX711_t hx711_sensors[LOADCELL_NUM];
//extern bool hx711_valid[LOADCELL_NUM];

void hx711_gpio_init(void);
bool hx711_read_data_pin(HX711_t *sensor);
void hx711_pulse_clock(void);
int32_t hx711_read(HX711_t *sensor);
bool is_floating_pin(GPIO_Port_TypeDef port, uint8_t pin);

#endif // HX711_H
