Audio Classifier Firmware for EFR32xG26
Overview
This firmware implements a keyword spotting application for the Silicon Labs EFR32MG26B510F3200IM68 microcontroller, using the Simplicity SDK Suite v2024.12.2 and the AI/ML Extension. The model is trained to classify audio inputs into four categories: pay, discount, combo, and unknown. The firmware is based on TensorFlow Lite Micro and integrates with Silicon Labs' audio feature generation and command recognition modules.
Features

Keyword Spotting: Recognizes four audio classes (pay, discount, combo, unknown) with a custom-trained TensorFlow Lite model.
Audio Processing: Uses a spectrogram-based feature extraction pipeline with configurable frontend settings (sample rate: 16kHz, window size: 30ms, step: 10ms, 104 filterbank channels).
Real-Time Inference: Runs on the EFR32xG26 with low-latency inference (100ms interval).
Smoothing and Suppression:
Averaging window: 800ms
Detection threshold: 230
Suppression time: 2000ms
Minimum detection count: 2
Ignore underscore labels: Enabled


Hardware: Supports Wireless Starter Kit (WSTK) or custom boards with EFR32xG26.
Output: Prints detected labels via serial (USART1, 115200 baud), with a higher score threshold (215) for the pay class.
Idle Timeout: 1000ms for power management.

Requirements

Hardware:
Silicon Labs EFR32xG26-based board (e.g., WSTK with EFR32MG26B510F3200IM68).
USB cable for JTAG/SWD debugging and serial communication.


Software:
Simplicity Studio v5 with Simplicity SDK Suite v2024.12.2.
AI/ML Extension installed (Preferences > SDKs > Add Extension > AI/ML).
Simplicity Commander (included with Simplicity Studio).
Serial terminal software (e.g., Tera Term, PuTTY).


Dataset:
Audio dataset at /content/drive/MyDrive/iot_challenge/datasets/keyword_dataset with subdirectories pay, discount, combo, and unknown, containing .wav files (16kHz, mono).


Model Training:
Python script keyword_spotting_custom_model_v1.py for training and exporting the .tflite model.
Dependencies: TensorFlow, Librosa, MLTK (Machine Learning Toolkit).



Project Structure

config/audio_classifier_config.h: Configuration file defining labels (pay, discount, combo, unknown), smoothing parameters, and task settings.
src/audio_classifier.cc: Main implementation of the keyword spotting task, including initialization, inference, and output processing.
src/recognize_commands.cc: Processes model output with smoothing and suppression logic, configured for 4 classes.
src/recognize_commands.h: Header file defining the RecognizeCommands class and queue for result smoothing.
tensorflow/: Directory containing the trained .tflite model (generated from keyword_spotting_custom_model_v1.py).

Setup Instructions
1. Train the Model

Prepare the dataset:
Ensure the dataset directory (/content/drive/MyDrive/iot_challenge/datasets/keyword_dataset) contains subdirectories pay, discount, combo, and unknown with .wav files.
Verify all audio files are 16kHz, mono, and at least 1 second long.


Update the training script:
Use keyword_spotting_custom_model_v1.py and ensure the classes list is set to ['pay', 'discount', 'combo', 'unknown'].
Install dependencies: pip install tensorflow librosa mltk.
Train the model: python keyword_spotting_custom_model_v1.py.
Export the .tflite model to the project’s tensorflow directory.


Verify model output:
The model should output 4 classes (pay, discount, combo, unknown) with int8 quantization.



2. Build the Firmware

Open Simplicity Studio v5.
Create or open an Audio Classifier project:
File > New > Silicon Labs Project Wizard > Select "Audio Classifier" example (AI/ML Extension).
Choose part number: EFR32MG26B510F3200IM68.


Update source files:
Ensure config/audio_classifier_config.h, src/audio_classifier.cc, src/recognize_commands.cc, and src/recognize_commands.h are configured for 4 classes (pay, discount, combo, unknown).
Copy the trained .tflite model to the tensorflow directory.


Build the project:
Click the Build button (hammer icon).
Output files (.s37 or .hex) will be generated in the build/debug directory.



3. Flash the Firmware

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


Flash the firmware:commander flash path/to/audio_classifier.s37 --verbose

Replace path/to/audio_classifier.s37 with the path to the built firmware file.
Alternatively, use Simplicity Studio GUI:
Tools > Simplicity Commander > Tab "Flash".
Select the .s37 file and click "Flash".



4. Test the Firmware

Connect to the serial port:
Use Tera Term or PuTTY.
Configure: USART1, 115200 baud, 8N1.
Port is typically shown in Simplicity Studio’s "Debug Adapters" or Device Manager.


Play audio samples (e.g., pay.wav, unknown.wav) near the board’s microphone.
Monitor serial output:
Expected output: Detected labels (pay, discount, combo, unknown).
Note: The pay label requires a score ≥ 215; other labels print without this threshold.


Verify all 4 classes are detected correctly based on input audio.

Troubleshooting

Flash Errors:
Error 0x04 (Connection Error): Check USB cable, port, or try another WSTK. Use ISP mode (hold ISP + press/release RESET).
Error 0x0D (Invalid Firmware): Ensure the firmware is built for EFR32MG26B510F3200IM68 and the .tflite model matches the 4-class configuration.
Run: commander device unlock --debug followed by commander device masserase.


No Output or Incorrect Labels:
Verify the .tflite model is correctly integrated (check tensorflow directory).
Ensure dataset includes sufficient samples for all classes (at least 50 per class recommended).
Check serial baud rate (115200) and connection.


Model Training Issues:
Run keyword_spotting_custom_model_v1.py with --verbose to debug dataset loading.
Ensure all classes have enough samples.


Contact Support:
Post logs (Commander or Studio) to Silicon Labs Community (https://community.silabs.com).
Include part number, SDK version (v2024.12.2), and firmware/model details.



Notes

The firmware is optimized for low-power operation (EM1 mode) with a 1000ms idle timeout for power management.
Adjust kDetectThr (230), kAvgWindowMs (800), or kSuppressMs (2000) in audio_classifier.cc if detection sensitivity needs tuning.
For BLE integration, implement the // TODO: BLE next step section in audio_classifier.cc.


License

Copyright 2025 Silicon Laboratories Inc. (Zlib License).
Copyright 2025 Quoc Tinh [C] (Apache License 2.0).
See the firmware source for full license details.