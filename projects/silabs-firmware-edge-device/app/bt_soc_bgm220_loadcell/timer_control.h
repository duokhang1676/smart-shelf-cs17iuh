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
#ifndef TIMER_CONTROL_H
#define TIMER_CONTROL_H

#include "sl_status.h"
#include <stdbool.h>

void timer_control_init(void);
sl_status_t trigger_gpio_high_nonblocking(uint32_t duration_ms);
bool is_trigger_done(void);

#endif // TIMER_CONTROL_H
