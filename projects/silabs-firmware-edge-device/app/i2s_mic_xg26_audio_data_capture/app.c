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

#include "sl_mic.h"
#include "sl_udelay.h"
#include "sl_iostream.h"
#include <stdio.h>
#include <string.h>

#define MIC_SAMPLE_RATE     16000
#define MIC_N_CHANNELS      1
#define MIC_TOTAL_SAMPLES   16000
#define BYTES_PER_SAMPLE    2
#define HEADER_SIZE         2

static int16_t mic_buffer[MIC_TOTAL_SAMPLES];
extern sl_iostream_t *sl_iostream_vcom_handle;

void app_init(void) {
    sl_status_t status;

    status = sl_mic_init(MIC_SAMPLE_RATE, MIC_N_CHANNELS);
    if (status != SL_STATUS_OK) {
        printf("Mic init failed: 0x%lx\r\n", status);
        return;
    }

    status = sl_mic_start();
    if (status != SL_STATUS_OK) {
        printf("Mic start failed: 0x%lx\r\n", status);
        return;
    }

    sl_iostream_set_default(sl_iostream_vcom_handle);

    printf("Mic ready. Waiting for 's' command...\r\n");
}

void app_process_action(void) {
    uint8_t ch;
    size_t bytes_read;
    sl_status_t status;

    // check sending key to uart
    if (sl_iostream_read(sl_iostream_vcom_handle, &ch, 1, &bytes_read) == SL_STATUS_OK && bytes_read == 1) {
        if (ch == 's') {
            printf("Received 's', recording...\r\n");

            // check num of sample ( must be equal to MIC_TOTAL_SAMPLE)
            status = sl_mic_get_n_samples(mic_buffer, MIC_TOTAL_SAMPLES);
            if (status == SL_STATUS_OK) {
                // Send header
                uint8_t header[2] = {0xAA, 0x55};
                sl_iostream_write(sl_iostream_vcom_handle, header, HEADER_SIZE);

                // Send audio data
                sl_iostream_write(sl_iostream_vcom_handle,
                                  (uint8_t *)mic_buffer,
                                  MIC_TOTAL_SAMPLES * BYTES_PER_SAMPLE);

                printf("Sent %d samples.\r\n", MIC_TOTAL_SAMPLES);
            } else {
                printf("Mic read failed: 0x%lx\r\n", status);
            }
        }
    }
}

