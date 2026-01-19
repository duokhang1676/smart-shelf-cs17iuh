'''
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
'''
# import asyncio
# from bleak import BleakClient, BleakError
# import os
# from app.modules import globals
# from dotenv import load_dotenv

# load_dotenv()
# XG26_VOICE_ADDRESS = os.getenv("XG26_VOICE_ADDRESS")
# VOICE_CHAR_UUID = os.getenv("VOICE_CHAR_UUID")

# def notification_handler(sender, data):
#     globals.set_voice_command(data.decode('utf-8'))
#     print(f"[{sender}] -> {globals.voice_command}")

# async def connect_and_listen(address):
#     while True:
#         try:
#             print(f"Connecting to xG26 voice: {address}...")
#             async with BleakClient(address) as client:
#                 if client.is_connected:
#                     print("Xg26 voice connected successfully.")
#                     await client.start_notify(VOICE_CHAR_UUID, notification_handler)
                    
#                     while client.is_connected:
#                         await asyncio.sleep(1)

#                     print("xg26 voice disconnected.")
#         except (BleakError, OSError) as e:
#             print(f"Xg26 voice connection error: {e}")
#             await asyncio.sleep(3)

# def start_xg26_voice_command():
#     asyncio.run(connect_and_listen(XG26_VOICE_ADDRESS))

# UART version
import serial
import time 
import threading
from app.modules import globals
from app.utils.sound_utils import play_sound

def start_xg26_voice_command():
    ser = None
    while ser is None:
        try:
            ser = serial.Serial(
                port='/dev/ttyACM0',      
                baudrate=115200, 
                bytesize=serial.EIGHTBITS,
                parity=serial.PARITY_NONE,
                stopbits=serial.STOPBITS_ONE,
                timeout=1       
            )
            print(f"Connected to {ser.port} at baudrate {ser.baudrate}")
            threading.Thread(target=play_sound, args=("app/static/sounds/connected_voice.mp3",)).start()
        except serial.SerialException as e:
            print(f"Error opening serial port: {e}")
            time.sleep(10)
     
    print("Listening xg26 voice on UART...")

    try:
        while True:
            time.sleep(0.1)
            if ser.in_waiting > 0: 
                data = ser.readline().decode(errors='ignore').strip()
                print("Command:", data)
                globals.set_voice_command(data)
    except KeyboardInterrupt:
        print("ERROR xG26 voice command stopped.")
    finally:
        ser.close()
