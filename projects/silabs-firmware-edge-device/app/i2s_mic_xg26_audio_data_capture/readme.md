Audio Capture Firmware for EFR32xG26
Overview
This firmware enables audio data capture from the microphone on the Silicon Labs EFR32MG26B510F3200IM68 microcontroller, using the Simplicity SDK Suite v2024.12.2. The firmware records 1 second of audio (16,000 samples at 16kHz, mono, 16-bit) when triggered by a serial command ('s'), and sends the data over the VCOM serial interface. The accompanying Python script audio_capture.py (located in the resources folder) receives this data and saves it as a WAV file for further processing, such as training a keyword spotting model.
Features

Audio Capture: Records 16,000 samples (1 second) at 16kHz, mono, 16-bit PCM from the XG26 microphone.
Trigger Mechanism: Starts recording when receiving the 's' character via serial (VCOM, 115200 baud).
Data Format: Sends a 2-byte header (0xAA, 0x55) followed by 32,000 bytes of audio data (16,000 samples × 2 bytes/sample).
Hardware: Supports Wireless Starter Kit (WSTK) or custom boards with EFR32xG26.
Python Integration: Works with audio_capture.py to save audio data as WAV files.

Requirements

Hardware:
Silicon Labs EFR32xG26-based board (e.g., WSTK with EFR32MG26B510F3200IM68).
USB cable for JTAG/SWD debugging and VCOM serial communication.


Software:
Simplicity Studio v5 with Simplicity SDK Suite v2024.12.2.
Simplicity Commander (included with Simplicity Studio).
Serial terminal software (e.g., Tera Term, PuTTY) for testing.
Python 3.8+ with dependencies: pyserial, wave, and numpy for running audio_capture.py.


Files:
Firmware source file (e.g., app.c) containing the audio capture logic.
Python script resources/audio_capture.py for receiving and saving audio data as WAV files.



Project Structure

src/app.c: Main firmware implementation for initializing the microphone, handling serial input, and capturing/sending audio data.
resources/audio_capture.py: Python script to receive audio data via serial and save it as WAV files.
tensorflow/ (optional): Directory for storing trained models if used with an Audio Classifier project.

Setup Instructions
1. Build the Firmware

Open Simplicity Studio v5.
Create or open an Audio Capture project:
File > New > Silicon Labs Project Wizard > Select a suitable example (e.g., "Microphone" or a custom project).
Choose part number: EFR32MG26B510F3200IM68.


Add or update the firmware source:
Copy the provided app.c (or equivalent) to the project’s source directory.
Ensure it includes the microphone initialization and audio capture logic as shown in the firmware code.


Build the project:
Click the Build button (hammer icon).
Output files (.s37 or .hex) will be generated in the build/debug directory.



2. Flash the Firmware

Connect the EFR32xG26 board (e.g., WSTK) to your computer via USB.
Verify board detection:
In Simplicity Studio, check the "Debug Adapters" tab to confirm the board is recognized.
Or run: commander device info in Command Prompt/Terminal.


Perform Mass Erase (if needed):commander device masserase

If it fails, use ISP mode:
Hold the ISP button on the board.
Press and release the RESET button.
Release the ISP button.
Retry the Mass Erase command.


Flash the bootloader (optional, if not already present):
Build a Gecko Bootloader project for EFR32xG26 (e.g., "Bootloader - SoC Internal Storage Single").
Flash: commander flash path/to/bootloader.s37.


Flash the firmware:commander flash path/to/audio_capture.s37 --verbose

Replace path/to/audio_capture.s37 with the path to the built firmware file.
Alternatively, use Simplicity Studio GUI:
Tools > Simplicity Commander > Tab "Flash".
Select the .s37 file and click "Flash".



3. Set Up the Python Script

Install Python dependencies:pip install pyserial wave numpy


Verify the audio_capture.py script is in the resources folder of your project.
Update the script (if needed) to match your serial port and settings:
Serial port: Typically COMx (Windows) or /dev/ttyACMx (Linux/macOS).
Baud rate: 115200 (matching the firmware’s VCOM configuration).
Expected data: 2-byte header (0xAA, 0x55) followed by 32,000 bytes (16,000 samples × 2 bytes/sample).



4. Capture Audio Data

Connect to the serial port:
Open a terminal (e.g., Tera Term, PuTTY) and configure: USART1, 115200 baud, 8N1.
Verify the board outputs: Mic ready. Waiting for 's' command....


Run the Python script:python resources/audio_capture.py


Ensure the script is configured to use the correct serial port.
The script will send the 's' command to trigger recording and save the received audio data as a WAV file.


Trigger recording:
If the script doesn’t send 's' automatically, use the serial terminal to send the 's' character.
The board will respond with: Received 's', recording... and Sent 16000 samples..


Verify the WAV file:
Check the output directory specified in audio_capture.py for the generated WAV file.
Ensure the file is 16kHz, mono, 16-bit, and approximately 1 second long.



Troubleshooting

Flash Errors:
Error 0x04 (Connection Error): Check USB cable, port, or try another WSTK. Use ISP mode (hold ISP + press/release RESET).
Error 0x0D (Invalid Firmware): Ensure the firmware is built for EFR32MG26B510F3200IM68.
Run: commander device unlock --debug followed by commander device masserase.


No Serial Output:
Verify serial settings (115200 baud, 8N1) and VCOM port in Device Manager or Simplicity Studio.
Check if sl_iostream_vcom_handle is correctly initialized in the firmware.


Microphone Issues:
If sl_mic_init or sl_mic_start fails, check hardware connections (microphone on WSTK) and ensure the microphone is enabled in the board’s configuration.
Verify MIC_SAMPLE_RATE (16kHz) and MIC_N_CHANNELS (1) match your hardware.


Python Script Issues:
Ensure the correct serial port is specified in audio_capture.py.
Check for the header (0xAA, 0x55) in the received data to confirm synchronization.
Verify the WAV file is correctly formatted (16kHz, mono, 16-bit).


Contact Support:
Post logs (Commander, Studio, or Python errors) to Silicon Labs Community (https://community.silabs.com).
Include part number, SDK version (v2024.12.2), and firmware details.



Notes

The firmware captures exactly 16,000 samples (1 second) to match the requirements of the keyword spotting dataset (e.g., for training with keyword_spotting_custom_model_v1.py).
The Python script audio_capture.py must be configured to handle the 2-byte header and 32,000 bytes of audio data correctly.
For integration with a keyword spotting model, ensure captured WAV files are stored in the appropriate dataset directories (pay, discount, combo, unknown).
Adjust IDLE_TIMEOUT_MS (1000ms) in the firmware if power management needs tuning.

License

Copyright 2025 Quoc Tinh [C] (Apache License 2.0).
See the firmware source for full license details.
