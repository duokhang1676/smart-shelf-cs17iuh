'''
* Copyright 2025 Ngo Quoc Tinh [C]
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
'''
import serial
import numpy as np
from scipy.io.wavfile import write as write_wav
import os

# Cấu hình
SERIAL_PORT = 'COM8'           
BAUD_RATE = 115200
SAMPLE_RATE = 16000
NUM_SAMPLES = 16000            # with 1 second duration
BYTES_PER_SAMPLE = 2
TOTAL_BYTES = NUM_SAMPLES * BYTES_PER_SAMPLE
HEADER = b'\xAA\x55'

# Create folder if not exists
def get_next_clip_id(folder):
    files = [f for f in os.listdir(folder) if f.startswith("clip_") and f.endswith(".wav")]
    ids = []
    for f in files:
        try:
            ids.append(int(f.replace("clip_", "").replace(".wav", "")))
        except ValueError:
            continue
    return max(ids) + 1 if ids else 0

def main():
    folder = "combo"   # Folder to save audio data
    os.makedirs(folder, exist_ok=True)
    clip_id = get_next_clip_id(folder)

    print(f"Opening {SERIAL_PORT} @ {BAUD_RATE} baud...")
    with serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=2) as ser:
        ser.reset_input_buffer()

        try:
            while True:
                input("Enter to record 1s audio data...")

                # Send command to start recording
                ser.write(b's')
                print("Sent 's', wait for header...")

                # Search header 0xAA 0x55
                buffer = bytearray()
                while True:
                    byte = ser.read(1)
                    if not byte:
                        print("Timeout while waiting for header.")
                        return
                    buffer += byte
                    if len(buffer) >= 2:
                        if buffer[-2:] == HEADER:
                            print("Header found, starting to read audio data...")
                            break

                # Read the audio data
                audio_data = bytearray()
                while len(audio_data) < TOTAL_BYTES:
                    chunk = ser.read(TOTAL_BYTES - len(audio_data))
                    if not chunk:
                        print("Timeout while waiting for data.")
                        return
                    audio_data += chunk

                if len(audio_data) != TOTAL_BYTES:
                    print("Received incomplete data, expected", TOTAL_BYTES, "bytes but got", len(audio_data))
                    continue

                samples = np.frombuffer(audio_data, dtype=np.int16)

                filename = f"{folder}/clip_{clip_id:04d}.wav"
                write_wav(filename, SAMPLE_RATE, samples)
                print(f"Saved {filename} ({len(samples)} samples)")

                clip_id += 1
                ser.reset_input_buffer()

        except KeyboardInterrupt:
            print("\nRecording stopped by user.")

if __name__ == "__main__":
    main()
