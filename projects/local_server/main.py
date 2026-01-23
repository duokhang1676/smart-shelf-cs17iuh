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
import threading
import app.webserver as webserver
from app.modules import update_loadcell_quantity
from app.modules import listen_rfid
from app.modules import xg26_voice_command
from app.modules import xg26_sensor
from app.modules import tracking_customer_behavior
from app.modules import wifi_manager
from app.utils.sound_utils import play_sound
def main():
    threading.Thread(target=play_sound, args=("app/static/sounds/start-program.mp3",)).start()

    # Khởi động WiFi Manager trước để kiểm tra kết nối
    threading.Thread(target=wifi_manager.start_wifi_manager, daemon=True).start()
    
    # Đợi cho WiFi kết nối (timeout 60s để tránh đợi vô thời hạn)
    print("Waiting for WiFi connection...")
    wifi_connected = wifi_manager.wait_for_wifi(timeout=60)
    
    if wifi_connected:
        print("WiFi connected! Starting other services...")
        threading.Thread(target=webserver.start_webserver, daemon=True).start()
    # threading.Thread(target=listen_rfid.start_listen_rfid, daemon=True).start()
    # threading.Thread(target=xg26_sensor.start_xg26_sensor, daemon=True).start()
    # threading.Thread(target=update_loadcell_quantity.start_update_loadcell_quantity, daemon=True).start()
    # threading.Thread(target=tracking_customer_behavior.start_tracking_customer_behavior, daemon=True).start()
    # threading.Thread(target=xg26_voice_command.start_xg26_voice_command, daemon=True).start()

    else:
        print("WiFi connection timeout - continuing anyway (may use hotspot mode)")
if __name__ == '__main__':
    main()
    while True:
        try:
            # Keep the main thread alive
            threading.Event().wait(1)
        except KeyboardInterrupt:
            print("Exiting...")
            break   