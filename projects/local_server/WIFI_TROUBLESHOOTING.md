# Hướng dẫn truy cập WiFi Setup

## Vấn đề: Không thể truy cập trang WiFi Setup

### ✅ Các bước kiểm tra:

## 1. Kiểm tra Jetson đã chạy chương trình chưa

```bash
# Chạy chương trình trên Jetson
python main.py
```

Sau khi chạy, bạn sẽ thấy thông tin:
```
==============================================================
🌐 WEBSERVER STARTED SUCCESSFULLY
==============================================================
📍 Local IP: 192.168.x.x
🌐 Access URLs:
   - Local:    http://localhost:5000
   - Network:  http://192.168.x.x:5000
   - WiFi Setup: http://192.168.x.x:5000/wifi-setup

💡 Nếu đang dùng hotspot, truy cập: http://192.168.4.1:5000/wifi-setup
==============================================================
```

## 2. Xác định IP của Jetson

### Cách 1: Xem log khi chương trình khởi động
Sau dòng "📍 Local IP:" sẽ có địa chỉ IP

### Cách 2: Dùng lệnh trên Jetson
```bash
# Xem tất cả IP
ip addr show

# Hoặc
hostname -I

# Hoặc chỉ xem WiFi
ip addr show wlan0
```

### Cách 3: Từ router WiFi
- Đăng nhập vào router
- Xem danh sách thiết bị kết nối
- Tìm Jetson và xem IP của nó

## 3. Các URL có thể thử

Sau khi có IP của Jetson (ví dụ: 192.168.1.100), thử các URL sau:

```
✅ http://192.168.1.100:5000/wifi-setup
✅ http://192.168.1.100:5000/setup
✅ http://192.168.1.100:5000/
```

### Nếu đang kết nối hotspot của Jetson:
```
✅ http://192.168.4.1:5000/wifi-setup
✅ http://192.168.4.1:5000/setup
✅ http://192.168.4.1:5000/
```

## 4. Kiểm tra firewall

### Trên Jetson, kiểm tra firewall:
```bash
# Kiểm tra ufw status
sudo ufw status

# Nếu firewall đang bật, cho phép port 5000
sudo ufw allow 5000/tcp

# Hoặc tắt firewall (không khuyến nghị)
sudo ufw disable
```

## 5. Kiểm tra webserver đang chạy

### Trên Jetson:
```bash
# Kiểm tra port 5000 có đang listen không
sudo netstat -tlnp | grep 5000

# Hoặc
sudo lsof -i :5000
```

Kết quả mong đợi:
```
tcp  0  0  0.0.0.0:5000  0.0.0.0:*  LISTEN  12345/python
```

## 6. Test từ Jetson

### Trên Jetson, thử truy cập:
```bash
# Test localhost
curl http://localhost:5000/wifi-setup

# Test IP local
curl http://192.168.x.x:5000/wifi-setup
```

Nếu trả về HTML thì webserver đang hoạt động tốt.

## 7. Kiểm tra kết nối mạng

### Đảm bảo thiết bị di động và Jetson cùng mạng:

**Kịch bản 1: Dùng hotspot của Jetson**
- Jetson phát hotspot "JetsonSmartShelf"
- Điện thoại kết nối hotspot này
- Truy cập: `http://192.168.4.1:5000/wifi-setup`

**Kịch bản 2: Cùng WiFi**
- Jetson đã kết nối WiFi A
- Điện thoại cũng kết nối WiFi A
- Tìm IP của Jetson (192.168.x.x)
- Truy cập: `http://192.168.x.x:5000/wifi-setup`

## 8. Debug nâng cao

### Kiểm tra log chi tiết:
```bash
# Chạy với debug mode
python main.py 2>&1 | tee output.log
```

### Kiểm tra WiFi Manager:
```bash
# Xem WiFi status
nmcli dev status

# Xem các mạng WiFi
nmcli dev wifi list

# Xem kết nối hiện tại
nmcli connection show --active
```

## 9. Các lỗi thường gặp

### Lỗi: "This site can't be reached"
- ✅ Kiểm tra IP đúng chưa
- ✅ Kiểm tra port 5000
- ✅ Kiểm tra cùng mạng chưa
- ✅ Kiểm tra firewall

### Lỗi: "Connection refused"
- ✅ Webserver chưa chạy
- ✅ Chạy `python main.py` trên Jetson

### Lỗi: "Connection timeout"
- ✅ Firewall chặn port
- ✅ Không cùng mạng

### Lỗi: 404 Not Found
- ✅ URL sai, thử `/wifi-setup` hoặc `/setup`

## 10. Quick Fix Script

Tạo file `check_wifi_setup.sh` trên Jetson:

```bash
#!/bin/bash
echo "=== WiFi Setup Diagnostic ==="
echo ""
echo "1. Local IP Addresses:"
hostname -I
echo ""
echo "2. Port 5000 Status:"
sudo netstat -tlnp | grep 5000
echo ""
echo "3. WiFi Status:"
nmcli dev status | grep wifi
echo ""
echo "4. Active Connections:"
nmcli connection show --active
echo ""
echo "5. Access URLs:"
IP=$(hostname -I | awk '{print $1}')
echo "   http://$IP:5000/wifi-setup"
echo "   http://$IP:5000/setup"
echo "   http://192.168.4.1:5000/wifi-setup (if using hotspot)"
```

Chạy:
```bash
chmod +x check_wifi_setup.sh
./check_wifi_setup.sh
```

## 11. Liên hệ hỗ trợ

Nếu vẫn không được, cung cấp thông tin sau:
1. Output của `check_wifi_setup.sh`
2. Log khi chạy `python main.py`
3. Ảnh chụp lỗi trên trình duyệt
4. Output của `nmcli dev status`
