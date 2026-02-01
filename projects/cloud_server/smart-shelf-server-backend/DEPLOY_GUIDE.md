# 🚀 Hướng Dẫn Deploy Backend lên Render

## 📋 Checklist Trước Khi Deploy

- [x] Code đã tích hợp Cloudinary
- [x] Đã cài đặt cloudinary packages
- [x] Đã cấu hình .env
- [ ] Đã lấy API Key & Secret từ Cloudinary
- [ ] Đã push code lên GitHub

---

## 🔑 Bước 1: Lấy Cloudinary API Credentials

1. Truy cập: https://cloudinary.com/console
2. Đăng nhập hoặc tạo tài khoản (Free)
3. Trong **Dashboard**, sao chép:
   - **Cloud Name**: `dcs6zqppp` ✅ (đã có)
   - **API Key**: Sao chép
   - **API Secret**: Click "Reveal" → Sao chép

---

## 📤 Bước 2: Push Code Lên GitHub

```bash
git add .
git commit -m "feat: integrate Cloudinary for image storage"
git push origin main
```

---

## 🌐 Bước 3: Deploy Trên Render

### 3.1. Tạo Web Service Mới

1. Đăng nhập: https://render.com
2. Click **"New +"** → **"Web Service"**
3. Chọn repository GitHub của bạn
4. Cấu hình như sau:

### 3.2. Cấu hình Service

**Basic Settings:**
- **Name**: `iot-challenge-backend` (hoặc tên bạn thích)
- **Region**: Singapore (gần VN nhất)
- **Branch**: `main`
- **Root Directory**: để trống
- **Environment**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm start`

**Instance Type:**
- Chọn **Free** (đủ cho development)

---

## 🔐 Bước 4: Thêm Environment Variables

Trong phần **Environment**, thêm các biến sau:

```bash
# MongoDB
MONGO_URI=mongodb+srv://duc:123@iot.5gpyzzs.mongodb.net/cloud?retryWrites=true&w=majority&appName=IoT

# JWT
JWT_SECRET=DucDepZai09@@@

# Server
PORT=3000
NODE_ENV=production

# Cloudinary (QUAN TRỌNG!)
CLOUDINARY_CLOUD_NAME=dcs6zqppp
CLOUDINARY_API_KEY=<paste_api_key_từ_cloudinary>
CLOUDINARY_API_SECRET=<paste_api_secret_từ_cloudinary>

# Frontend URL (nếu có)
FRONTEND_URL=https://your-frontend-domain.vercel.app
```

> ⚠️ **Lưu ý**: Thay thế `<paste_api_key_từ_cloudinary>` và `<paste_api_secret_từ_cloudinary>` bằng giá trị thực từ Cloudinary Dashboard!

---

## 🎯 Bước 5: Deploy

1. Click **"Create Web Service"**
2. Render sẽ tự động:
   - Clone repository
   - Chạy `npm install`
   - Chạy `npm start`
   - Deploy lên production

3. Đợi ~3-5 phút để build hoàn tất

---

## ✅ Bước 6: Kiểm Tra Deployment

### 6.1. Kiểm tra URL

Render sẽ cung cấp URL dạng:
```
https://iot-challenge-backend.onrender.com
```

### 6.2. Test API

```bash
# Kiểm tra server đang chạy
curl https://iot-challenge-backend.onrender.com/api

# Test upload ảnh (dùng Postman hoặc curl)
curl -X POST https://iot-challenge-backend.onrender.com/api/products \
  -F "product_name=Test Product" \
  -F "price=100000" \
  -F "image=@/path/to/image.jpg"
```

### 6.3. Kiểm tra Cloudinary

1. Sau khi upload ảnh qua API
2. Vào https://cloudinary.com/console/media_library
3. Kiểm tra folder `smart-shelf` → ảnh đã được upload

---

## 🔧 Troubleshooting

### Lỗi: "Application failed to respond"
- **Nguyên nhân**: PORT configuration
- **Giải pháp**: Đảm bảo app.js sử dụng `process.env.PORT`

```javascript
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
```

### Lỗi: "Cloudinary upload failed"
- Kiểm tra CLOUDINARY_API_KEY và CLOUDINARY_API_SECRET đã đúng chưa
- Vào Render Dashboard → Environment → Xác nhận các biến

### Service restart liên tục
- Xem Logs trong Render Dashboard
- Thường do lỗi kết nối MongoDB hoặc missing env variables

---

## 📊 Monitoring

### View Logs
Render Dashboard → Your Service → **Logs**

### Auto-Deploy
- Mỗi khi push code lên GitHub (branch main)
- Render tự động rebuild và deploy

---

## 🎉 Hoàn Thành!

Backend đã được deploy với:
- ✅ Không dùng Docker (native Node.js)
- ✅ Cloudinary lưu ảnh trên cloud
- ✅ Auto-deploy khi push code
- ✅ Free tier (đủ cho development)

**Backend URL**: `https://<your-service-name>.onrender.com`

---

## 📝 Next Steps

1. Cập nhật FRONTEND_URL để kết nối với frontend
2. Cấu hình CORS nếu cần
3. Test tất cả endpoints
4. Monitor performance qua Render Dashboard

---

## 🆘 Support

Nếu có vấn đề:
1. Check Logs trên Render
2. Verify Environment Variables
3. Test Cloudinary credentials trên local trước
