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
import subprocess
import time
import threading
import logging
import sys
import shutil

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

HOTSPOT_SSID = "JetsonSmartShelf"
HOTSPOT_PASSWORD = "smartshelf123"
CHECK_INTERVAL = 10  # seconds

# Kiểm tra platform và nmcli
IS_LINUX = sys.platform.startswith('linux')
HAS_NMCLI = shutil.which('nmcli') is not None

wifi_status = {
    'connected': False,
    'ssid': None,
    'hotspot_active': False,
    'error': None
}

# Cache cho kết quả scan WiFi
last_scan_time = 0
last_scan_results = []
SCAN_COOLDOWN = 10  # giây - thời gian tối thiểu giữa các lần scan

def check_system_requirements():
    """Kiểm tra xem hệ thống có đủ yêu cầu không"""
    if not IS_LINUX:
        logger.warning("WiFi Manager chỉ hoạt động trên Linux. Platform hiện tại: " + sys.platform)
        wifi_status['error'] = f"Không hỗ trợ platform {sys.platform}. Chỉ hoạt động trên Linux/Jetson Nano."
        return False
    
    if not HAS_NMCLI:
        logger.error("nmcli không tìm thấy. Vui lòng cài đặt NetworkManager:")
        logger.error("  sudo apt-get update")
        logger.error("  sudo apt-get install network-manager")
        wifi_status['error'] = "nmcli không tìm thấy. Cài đặt: sudo apt-get install network-manager"
        return False
    
    return True

def check_wifi_connection():
    """Kiểm tra xem Jetson có kết nối WiFi không"""
    try:
        # Kiểm tra trạng thái kết nối
        result = subprocess.run(['nmcli', '-t', '-f', 'GENERAL.STATE', 'general'],
                              capture_output=True, text=True, timeout=5)
        
        if result.returncode == 0 and 'connected' in result.stdout:
            # Lấy thông tin SSID hiện tại
            ssid_result = subprocess.run(['nmcli', '-t', '-f', 'active,ssid', 'dev', 'wifi'],
                                        capture_output=True, text=True, timeout=5)
            
            for line in ssid_result.stdout.split('\n'):
                if line.startswith('yes:'):
                    ssid = line.split(':', 1)[1]
                    wifi_status['connected'] = True
                    wifi_status['ssid'] = ssid
                    return True
        
        wifi_status['connected'] = False
        wifi_status['ssid'] = None
        return False
    except Exception as e:
        logger.error(f"Error checking WiFi connection: {e}")
        return False

def scan_wifi_networks():
    """Quét các mạng WiFi khả dụng"""
    global last_scan_time, last_scan_results
    
    if not HAS_NMCLI or not IS_LINUX:
        logger.error("Cannot scan WiFi: nmcli not available")
        return []
    
    # Kiểm tra xem có quá sớm để scan lại không
    current_time = time.time()
    time_since_last_scan = current_time - last_scan_time
    
    if time_since_last_scan < SCAN_COOLDOWN and last_scan_results:
        logger.info(f"Using cached WiFi scan results (scanned {int(time_since_last_scan)}s ago)")
        return last_scan_results
    
    try:
        # Thử rescan, nhưng không fail nếu bị từ chối
        try:
            subprocess.run(['nmcli', 'dev', 'wifi', 'rescan'], 
                          capture_output=True, timeout=5, check=False)
            time.sleep(1)
        except Exception as e:
            logger.warning(f"Rescan failed (will use existing data): {e}")
        
        # Lấy danh sách WiFi từ cache của NetworkManager
        result = subprocess.run(['nmcli', '-t', '-f', 'SSID,SIGNAL,SECURITY', 'dev', 'wifi', 'list'],
                              capture_output=True, text=True, timeout=10)
        
        networks = []
        seen_ssids = set()
        
        for line in result.stdout.split('\n'):
            if line.strip():
                parts = line.split(':')
                if len(parts) >= 3:
                    ssid = parts[0]
                    signal = parts[1]
                    security = parts[2]
                    
                    # Bỏ qua SSID trống hoặc trùng lặp
                    if ssid and ssid not in seen_ssids:
                        seen_ssids.add(ssid)
                        networks.append({
                            'ssid': ssid,
                            'signal': int(signal) if signal.isdigit() else 0,
                            'security': security if security else 'Open'
                        })
        
        # Sắp xếp theo cường độ tín hiệu
        networks.sort(key=lambda x: x['signal'], reverse=True)
        
        # Cập nhật cache
        last_scan_time = current_time
        last_scan_results = networks
        
        return networks
    except FileNotFoundError:
        logger.error("nmcli command not found. Install NetworkManager: sudo apt-get install network-manager")
        return []
    except Exception as e:
        logger.error(f"Error scanning WiFi networks: {e}")
        return []

def connect_to_wifi(ssid, password=None):
    """Kết nối tới mạng WiFi"""
    if not HAS_NMCLI or not IS_LINUX:
        error_msg = "Cannot connect: nmcli not available. Install NetworkManager on Linux/Jetson Nano."
        logger.error(error_msg)
        return False, error_msg
    
    try:
        logger.info(f"Attempting to connect to WiFi: {ssid}")
        
        # Tắt hotspot nếu đang bật
        if wifi_status['hotspot_active']:
            stop_hotspot()
        
        # Xóa kết nối cũ nếu có
        subprocess.run(['nmcli', 'connection', 'delete', ssid], 
                      capture_output=True, timeout=5)
        
        # Kết nối WiFi
        if password:
            cmd = ['nmcli', 'dev', 'wifi', 'connect', ssid, 'password', password]
        else:
            cmd = ['nmcli', 'dev', 'wifi', 'connect', ssid]
        
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        
        if result.returncode == 0:
            logger.info(f"Successfully connected to {ssid}")
            wifi_status['connected'] = True
            wifi_status['ssid'] = ssid
            wifi_status['hotspot_active'] = False
            return True, "Connected successfully"
        else:
            logger.error(f"Failed to connect: {result.stderr}")
            return False, result.stderr
    except FileNotFoundError:
        error_msg = "nmcli not found. Install: sudo apt-get install network-manager"
        logger.error(error_msg)
        return False, error_msg
    except Exception as e:
        logger.error(f"Error connecting to WiFi: {e}")
        return False, str(e)

def start_hotspot():
    """Khởi động hotspot WiFi"""
    try:
        logger.info("Starting WiFi hotspot...")
        
        # Kiểm tra xem hotspot connection đã tồn tại chưa
        check_result = subprocess.run(['nmcli', 'connection', 'show', HOTSPOT_SSID],
                                     capture_output=True, timeout=5)
        
        if check_result.returncode == 0:
            # Hotspot connection đã tồn tại, chỉ cần bật lên
            result = subprocess.run(['nmcli', 'connection', 'up', HOTSPOT_SSID],
                                  capture_output=True, text=True, timeout=10)
        else:
            # Tạo hotspot mới
            result = subprocess.run([
                'nmcli', 'dev', 'wifi', 'hotspot',
                'ifname', 'wlan0',
                'ssid', HOTSPOT_SSID,
                'password', HOTSPOT_PASSWORD
            ], capture_output=True, text=True, timeout=10)
        
        if result.returncode == 0:
            logger.info(f"Hotspot started: {HOTSPOT_SSID}")
            wifi_status['hotspot_active'] = True
            wifi_status['connected'] = False
            wifi_status['ssid'] = None
            return True
        else:
            logger.error(f"Failed to start hotspot: {result.stderr}")
            return False
    except Exception as e:
        logger.error(f"Error starting hotspot: {e}")
        return False

def stop_hotspot():
    """Tắt hotspot WiFi"""
    try:
        logger.info("Stopping WiFi hotspot...")
        
        result = subprocess.run(['nmcli', 'connection', 'down', HOTSPOT_SSID],
                              capture_output=True, text=True, timeout=10)
        
        if result.returncode == 0:
            logger.info("Hotspot stopped")
            wifi_status['hotspot_active'] = False
            return True
        else:
            logger.warning(f"Failed to stop hotspot: {result.stderr}")
            return False
    except Exception as e:
        logger.error(f"Error stopping hotspot: {e}")
        return False

def wifi_monitor():
    """Luồng giám sát WiFi - tự động bật hotspot nếu mất kết nối"""
    logger.info("WiFi monitor started")
    
    # Kiểm tra yêu cầu hệ thống trước
    if not check_system_requirements():
        logger.error("WiFi Manager disabled: System requirements not met")
        return
    
    # Đợi một chút để các module khác khởi động
    time.sleep(5)
    
    while True:
        try:
            connected = check_wifi_connection()
            
            if not connected and not wifi_status['hotspot_active']:
                logger.warning("No WiFi connection detected. Starting hotspot...")
                start_hotspot()
            elif connected and wifi_status['hotspot_active']:
                logger.info("WiFi connected. Stopping hotspot...")
                stop_hotspot()
            
            time.sleep(CHECK_INTERVAL)
        except Exception as e:
            logger.error(f"Error in WiFi monitor: {e}")
            time.sleep(CHECK_INTERVAL)

def start_wifi_manager():
    """Khởi động WiFi manager"""
    logger.info("Starting WiFi Manager...")
    
    # Kiểm tra hệ thống ngay từ đầu
    if not check_system_requirements():
        logger.warning("WiFi Manager will not start - running in disabled mode")
        logger.warning("This is normal if you're running on Windows or without NetworkManager")
        return
    
    wifi_monitor()

def get_wifi_status():
    """Lấy trạng thái WiFi hiện tại"""
    if not HAS_NMCLI or not IS_LINUX:
        return wifi_status.copy()
    
    check_wifi_connection()
    return wifi_status.copy()
