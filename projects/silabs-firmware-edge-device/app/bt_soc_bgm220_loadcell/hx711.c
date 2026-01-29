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
#include "hx711.h"
#include "em_gpio.h"
#include "sl_udelay.h"

// Define HX711 clock pin
#define HX711_CLK_PORT     gpioPortA
#define HX711_CLK_PIN      4

// Global variable
HX711_t hx711_sensors[LOADCELL_NUM] = {
  { gpioPortB, 0 },
//  { gpioPortD, 3 }, //I2C_SDA
//  { gpioPortD, 2 }, //I2C_SCL
  { gpioPortB, 1 },
  { gpioPortB, 2 },
  { gpioPortB, 3 },
  { gpioPortB, 4 },
//  { gpioPortC, 0 }, //ERROR
  { gpioPortC, 1 },
  { gpioPortC, 2 },
  { gpioPortC, 3 },
//  { gpioPortC, 6 },
//  { gpioPortB, 0 },
};

// Init GPIO for loadcell
void hx711_gpio_init(void)
{
  GPIO_PinModeSet(HX711_CLK_PORT, HX711_CLK_PIN, gpioModePushPull, 0);
  for (int i = 0; i < LOADCELL_NUM; i++) {
    GPIO_PinModeSet(hx711_sensors[i].data_port, hx711_sensors[i].data_pin, gpioModeInput, 0);
  }
}

// Read DOUT pin state
bool hx711_read_data_pin(HX711_t *sensor)
{
  return GPIO_PinInGet(sensor->data_port, sensor->data_pin);
}

// Send 1 clock pulse
void hx711_pulse_clock(void)
{
  GPIO_PinOutSet(HX711_CLK_PORT, HX711_CLK_PIN);
  sl_udelay_wait(1);
  GPIO_PinOutClear(HX711_CLK_PORT, HX711_CLK_PIN);
  sl_udelay_wait(1);
}

// Read data 24 bit from HX711
int32_t hx711_read(HX711_t *sensor)
{
  uint32_t timeout = 1000000;
  while (hx711_read_data_pin(sensor)) {
    if (--timeout == 0) {
      return -1;  // Timeout
    }
  }

  int32_t value = 0;
  for (int i = 0; i < 24; i++) {
    value <<= 1;
    hx711_pulse_clock();
    if (hx711_read_data_pin(sensor)) {
      value++;
    }
  }

  hx711_pulse_clock(); // gain = 128

  //Sign bit handling
  if (value & 0x800000) {
    value |= 0xFF000000;
  }

  return value;
}

// Check gpio is floating
bool is_floating_pin(GPIO_Port_TypeDef port, uint8_t pin)
{
  GPIO_PinModeSet(port, pin, gpioModeInputPull, 1);
  sl_udelay_wait(10);
  bool high = GPIO_PinInGet(port, pin);

  GPIO_PinModeSet(port, pin, gpioModeInputPull, 0);
  sl_udelay_wait(10);
  bool low = GPIO_PinInGet(port, pin);

  GPIO_PinModeSet(port, pin, gpioModeInput, 0);

  return (high && !low);
}
