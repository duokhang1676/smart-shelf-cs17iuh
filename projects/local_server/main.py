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

# Flag để đảm bảo services chỉ start một lần
services_started = False

def start_all_services():
    """Khởi động tất cả các services (RFID, sensor, tracking, voice command)"""
    global services_started
    
    if services_started:
        print("Services already started - skipping")
        return
    
    print("Starting all services (RFID, sensors, tracking, voice command)...")
    services_started = True
    
    # threading.Thread(target=listen_rfid.start_listen_rfid, daemon=True).start()
    # threading.Thread(target=xg26_sensor.start_xg26_sensor, daemon=True).start()
    # threading.Thread(target=update_loadcell_quantity.start_update_loadcell_quantity, daemon=True).start()
    # threading.Thread(target=tracking_customer_behavior.start_tracking_customer_behavior, daemon=True).start()
    # threading.Thread(target=xg26_voice_command.start_xg26_voice_command, daemon=True).start()
    print("All services started successfully!")

def on_wifi_connected():
    """Callback được gọi khi WiFi kết nối thành công từ hotspot mode"""
    print("\n" + "="*50)
    print("WiFi connected! Starting remaining services...")
    print("="*50 + "\n")
    start_all_services()

def main():
    threading.Thread(target=play_sound, args=("app/static/sounds/start-program.mp3",)).start()

    # Đăng ký callback để tự động start services khi WiFi connected
    wifi_manager.set_wifi_connected_callback(on_wifi_connected)

    # Khởi động WiFi Manager trước để kiểm tra kết nối
    threading.Thread(target=wifi_manager.start_wifi_manager, daemon=True).start()
    
    # Đợi cho WiFi hoặc Hotspot sẵn sàng (timeout 60s)
    print("Waiting for network (WiFi or Hotspot)...")
    network_ready = wifi_manager.wait_for_wifi(timeout=60)
    
    if not network_ready:
        print("Network timeout - exiting...")
        return
    
    # Luôn khởi động webserver (cần cho cả WiFi mode và hotspot mode)
    threading.Thread(target=webserver.start_webserver, daemon=True).start()
    
    # Kiểm tra xem có WiFi thật hay chỉ hotspot
    wifi_status = wifi_manager.get_wifi_status()
    
    if wifi_status['connected']:
        # Có kết nối WiFi thật → Chạy TẤT CẢ services ngay
        print(f"WiFi connected to {wifi_status['ssid']}!")
        start_all_services()
    elif wifi_status['hotspot_active']:
        # Chỉ có hotspot → CHỈ chạy webserver, đợi user setup
        print("Hotspot mode: Waiting for WiFi setup...")
        print("Please connect to hotspot and visit http://10.42.0.1:5000/wifi-setup")
        print("Services will start automatically after WiFi is configured")
    else:
        print("No network available - exiting...")
        return
if __name__ == '__main__':
    main()
    while True:
        try:
            # Keep the main thread alive
            threading.Event().wait(1)
        except KeyboardInterrupt:
            print("Exiting...")
            break   