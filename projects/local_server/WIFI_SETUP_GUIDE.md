# WiFi Setup System for Jetson Nano - Smart Shelf

## Tổng quan

Hệ thống WiFi Setup tự động cho phép Jetson Nano:
- Tự động kiểm tra kết nối WiFi
- Phát hotspot WiFi khi không có kết nối
- Cung cấp giao diện web để người dùng setup WiFi
- Tự động tắt hotspot khi đã kết nối WiFi thành công

## Cấu trúc

```
app/
├── modules/
│   └── wifi_manager.py          # Module quản lý WiFi
├── routes/
│   └── wifi_routes.py           # API endpoints cho WiFi
├── templates/
│   └── wifi_setup.html          # Trang web setup WiFi
└── static/
    ├── css/
    │   └── wifi_setup.css       # Styling cho trang WiFi
    └── js/
        └── wifi_setup.js        # Logic frontend WiFi setup
```

## Cách hoạt động

### 1. Luồng WiFi Manager
- Chạy ngầm và kiểm tra kết nối WiFi mỗi 10 giây
- Nếu không có kết nối WiFi → Tự động bật hotspot
- Nếu đã kết nối WiFi → Tự động tắt hotspot

### 2. Hotspot Configuration
- **SSID:** SmartShelf-CS17IUH
- **Password:** 00001111
- **Interface:** wlan0

### 3. Web Interface
Truy cập: `http://10.42.0.1:5000/wifi-setup` (khi kết nối hotspot)

**Tính năng:**
- Hiển thị trạng thái kết nối hiện tại
- Quét và hiển thị danh sách WiFi khả dụng
- Hiển thị cường độ tín hiệu và loại bảo mật
- Form nhập password và kết nối WiFi
- Tự động refresh trạng thái

## API Endpoints

### GET `/api/wifi/status`
Lấy trạng thái WiFi hiện tại

**Response:**
```json
{
  "success": true,
  "data": {
    "connected": true,
    "ssid": "MyWiFi",
    "hotspot_active": false
  }
}
```

### GET `/api/wifi/scan`
Quét các mạng WiFi khả dụng

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "ssid": "MyWiFi",
      "signal": 85,
      "security": "WPA2"
    }
  ]
}
```

### POST `/api/wifi/connect`
Kết nối tới mạng WiFi

**Request:**
```json
{
  "ssid": "MyWiFi",
  "password": "mypassword"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Connected successfully"
}
```

### GET `/api/wifi/hotspot/info`
Lấy thông tin hotspot

**Response:**
```json
{
  "success": true,
  "data": {
    "ssid": "JetsonSmartShelf",
    "password": "smartshelf123"
  }
}
```

## Hướng dẫn sử dụng

### Cài đặt dependencies (trên Jetson Nano)

```bash
# NetworkManager thường đã được cài sẵn trên Jetson Nano
# Nếu chưa có, cài đặt:
sudo apt-get update
sudo apt-get install network-manager
```

### Thiết lập lần đầu

1. **Chạy chương trình:**
   ```bash
   python main.py
   ```

2. **Khi không có WiFi:**
   - Jetson sẽ tự động tạo hotspot với tên "JetsonSmartShelf"
   - Password: "smartshelf123"

3. **Kết nối thiết bị di động:**
   - Kết nối điện thoại/laptop với hotspot "JetsonSmartShelf"
   - Mở trình duyệt và truy cập: `http://192.168.4.1/wifi-setup`

4. **Setup WiFi:**
   - Nhấn nút "Quét lại" để quét mạng WiFi
   - Chọn WiFi muốn kết nối
   - Nhập password (nếu có)
   - Nhấn "Kết nối"

5. **Sau khi kết nối thành công:**
   - Hotspot sẽ tự động tắt
   - Jetson kết nối với WiFi đã chọn
   - Hệ thống tiếp tục hoạt động bình thường

## Tùy chỉnh

### Thay đổi thông tin Hotspot

Chỉnh sửa trong `app/modules/wifi_manager.py`:

```python
HOTSPOT_SSID = "TenHotspotMoi"
HOTSPOT_PASSWORD = "matkhaumoi"
CHECK_INTERVAL = 10  # Thời gian kiểm tra (giây)
```

### Thay đổi giao diện

- **CSS:** `app/static/css/wifi_setup.css`
- **JavaScript:** `app/static/js/wifi_setup.js`
- **HTML:** `app/templates/wifi_setup.html`

## Xử lý lỗi

### Hotspot không khởi động
```bash
# Kiểm tra NetworkManager
sudo systemctl status NetworkManager

# Restart NetworkManager
sudo systemctl restart NetworkManager
```

### Không thể kết nối WiFi
```bash
# Kiểm tra danh sách WiFi
nmcli dev wifi list

# Xóa kết nối cũ
nmcli connection delete <connection-name>

# Kết nối thủ công
nmcli dev wifi connect <SSID> password <password>
```

### Logs
Kiểm tra logs trong terminal để debug:
```bash
python main.py
# Logs sẽ hiển thị:
# - WiFi monitor started
# - No WiFi connection detected. Starting hotspot...
# - Hotspot started: JetsonSmartShelf
# - Successfully connected to <SSID>
```

## Bảo mật

⚠️ **Lưu ý:**
- Thay đổi password hotspot mặc định trong production
- Chỉ sử dụng hotspot khi cần thiết
- Tắt hotspot sau khi setup xong

## Requirements

- Python 3.6+
- NetworkManager
- Flask
- nmcli command-line tool

## Tích hợp với Main System

Module được tích hợp tự động trong `main.py`:

```python
from app.modules import wifi_manager

# Khởi động WiFi Manager
threading.Thread(target=wifi_manager.start_wifi_manager, daemon=True).start()
```

## Troubleshooting

### Jetson không tạo được hotspot
- Đảm bảo WiFi adapter hỗ trợ AP mode
- Kiểm tra quyền sudo cho nmcli commands

### Không quét được WiFi
- Đảm bảo WiFi adapter được bật
- Thử rescan thủ công: `nmcli dev wifi rescan`

### Kết nối WiFi thất bại
- Kiểm tra password chính xác
- Đảm bảo WiFi trong tầm kết nối
- Kiểm tra xem WiFi có ẩn SSID không

## License

Copyright 2025 Vo Duong Khang [C]
Licensed under the Apache License, Version 2.0
