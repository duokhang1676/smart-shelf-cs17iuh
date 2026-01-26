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
from app.modules import wifi_config_server
from app.utils.sound_utils import play_sound

def main():
    threading.Thread(target=play_sound, args=("app/static/sounds/start-program.mp3",)).start()

    # Khởi động WiFi Manager để kiểm tra kết nối
    threading.Thread(target=wifi_manager.start_wifi_manager, daemon=True).start()
    
    # Đợi cho WiFi hoặc Hotspot sẵn sàng (timeout 60s)
    print("Checking network connection...")
    network_ready = wifi_manager.wait_for_wifi(timeout=60)
    
    if not network_ready:
        print("Network timeout - exiting...")
        return
    
    # Kiểm tra có kết nối WiFi thật không
    wifi_status = wifi_manager.get_wifi_status()
    
    if wifi_status['connected']:
        # Có kết nối mạng → Chạy TẤT CẢ các luồng (webserver + services)
        print(f"✓ WiFi connected to {wifi_status['ssid']}!")
        print("Starting webserver and all services...")
        
        threading.Thread(target=webserver.start_webserver, daemon=True).start()
        threading.Thread(target=listen_rfid.start_listen_rfid, daemon=True).start()
        threading.Thread(target=xg26_sensor.start_xg26_sensor, daemon=True).start()
        threading.Thread(target=update_loadcell_quantity.start_update_loadcell_quantity, daemon=True).start()
        threading.Thread(target=tracking_customer_behavior.start_tracking_customer_behavior, daemon=True).start()
        #threading.Thread(target=xg26_voice_command.start_xg26_voice_command, daemon=True).start()
        
        print("All services started successfully!")
    else:
        # Không có kết nối mạng → CHỈ chạy WiFi config server
        print("✗ No WiFi connection detected")
        print("Starting WiFi configuration mode...")
        print(f"Connect to hotspot '{wifi_manager.HOTSPOT_SSID}' and visit http://10.42.0.1:5000")
        print("After WiFi setup, please reboot Jetson to start all services")
        
        threading.Thread(target=wifi_config_server.start_wifi_config_server, daemon=True).start()
if __name__ == '__main__':
    main()
    while True:
        try:
            # Keep the main thread alive
            threading.Event().wait(1)
        except KeyboardInterrupt:
            print("Exiting...")
            break   