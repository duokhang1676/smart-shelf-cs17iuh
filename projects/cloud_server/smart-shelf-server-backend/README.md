# 🛒 Smart Shelf - Backend API

Backend server cho hệ thống kệ hàng thông minh (Smart Shelf) với tích hợp IoT, thanh toán tự động và quản lý kho.

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.x-blue.svg)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green.svg)](https://www.mongodb.com/)
[![License](https://img.shields.io/badge/license-ISC-blue.svg)](LICENSE)

---

## 📋 Mục Lục

- [Tính Năng](#-tính-năng)
- [Tech Stack](#-tech-stack)
- [Cấu Trúc Project](#-cấu-trúc-project)
- [Cài Đặt](#-cài-đặt)
- [Cấu Hình](#-cấu-hình)
- [API Documentation](#-api-documentation)
- [Deployment](#-deployment)
- [Security](#-security)

---

## ✨ Tính Năng

### 🔐 Authentication & Authorization
- JWT-based authentication
- Bcrypt password hashing
- Role-based access control

### 📦 Product Management
- CRUD operations cho sản phẩm
- Upload ảnh lên Cloudinary
- Quản lý tồn kho
- Hỗ trợ combo/bundle products

### 🏪 Shelf Management
- Quản lý kệ hàng thông minh
- Tích hợp Load Cell (cân điện tử)
- Tạo QR code tự động cho mỗi kệ
- Theo dõi trọng lượng real-time

### 💳 Payment Integration
- Cấu hình Sepay payment gateway
- VietQR integration
- Mã hóa token AES-256-CBC
- Webhook cho transaction notifications

### 📊 Order Management
- Tạo đơn hàng tự động
- Upload ảnh khách hàng
- Theo dõi lịch sử đơn hàng
- Real-time order notifications

### 🔔 Real-time Features
- Socket.IO integration
- Live notifications
- Real-time weight monitoring
- Order status updates

### 🖼️ Media Management
- Cloudinary CDN integration
- Automatic image optimization
- Poster/Banner management

---

## 🛠️ Tech Stack

### Core
- **Runtime:** Node.js 18+
- **Framework:** Express.js 5.x
- **Database:** MongoDB Atlas (Mongoose ODM)
- **Language:** JavaScript

### Libraries & Tools
| Category | Technology |
|----------|-----------|
| **Authentication** | JWT, Bcrypt |
| **File Upload** | Multer, Cloudinary |
| **Real-time** | Socket.IO |
| **Encryption** | Crypto (AES-256-CBC) |
| **QR Code** | qrcode |
| **API Docs** | Swagger UI |
| **Logging** | Morgan |

---

## 📁 Cấu Trúc Project

```
IOT_challenge_BE/
├── app.js                      # Entry point
├── package.json               # Dependencies
├── .env.example              # Environment template
├── .gitignore                # Git ignore rules
│
├── src/
│   ├── config/
│   │   ├── database.js       # MongoDB connection
│   │   ├── cloudinary.js     # Cloudinary config
│   │   └── swagger.js        # Swagger setup
│   │
│   ├── model/
│   │   ├── User.js           # User schema
│   │   ├── Product.js        # Product schema
│   │   ├── Oder.js           # Order schema
│   │   ├── Shelf.js          # Shelf schema
│   │   ├── LoadCell.js       # Load cell schema
│   │   ├── SepayConfig.js    # Payment config
│   │   ├── Notification.js   # Notification schema
│   │   ├── Task.js           # Task schema
│   │   ├── Combo.js          # Combo schema
│   │   ├── History.js        # History schema
│   │   └── Poster.js         # Poster schema
│   │
│   ├── controller/
│   │   ├── auth.controller.js
│   │   ├── user.controller.js
│   │   ├── product.controller.js
│   │   ├── order.controller.js
│   │   ├── shelf.controller.js
│   │   ├── loadcell.controller.js
│   │   ├── sepayConfig.controller.js
│   │   ├── notification.controller.js
│   │   ├── task.controller.js
│   │   ├── combo.controller.js
│   │   ├── history.controller.js
│   │   └── poster.controller.js
│   │
│   ├── routes/
│   │   ├── index.js          # Route aggregator
│   │   ├── user.js
│   │   ├── product.js
│   │   ├── oder.js
│   │   ├── shelf.js
│   │   ├── loadcell.js
│   │   ├── sepayConfig.js
│   │   ├── notification.js
│   │   ├── task.js
│   │   ├── combo.js
│   │   ├── history.js
│   │   └── poster.js
│   │
│   ├── middleware/
│   │   ├── auth.js           # JWT verification
│   │   └── upload.js         # Multer + Cloudinary
│   │
│   └── utils/
│       ├── upload.helper.js  # Upload utilities
│       └── coerceUserIdToObjectIdArray.ts
│
└── public/
    └── stylesheets/
        └── style.css
```

---

## 🚀 Cài Đặt

### Prerequisites
- Node.js 18+ 
- MongoDB Atlas account
- Cloudinary account
- npm hoặc yarn

### Installation Steps

1. **Clone repository:**
```bash
git clone https://github.com/duokhang1676/smart-shelf-server-backend.git
cd smart-shelf-server-backend
```

2. **Install dependencies:**
```bash
npm install
```

3. **Setup environment variables:**
```bash
cp .env.example .env
# Edit .env với credentials thật của bạn
```

4. **Start development server:**
```bash
npm run dev
```

5. **Start production server:**
```bash
npm start
```

Server sẽ chạy tại: `http://localhost:3000`

---

## ⚙️ Cấu Hình

### Environment Variables

Tạo file `.env` trong thư mục root:

```bash
# MongoDB Connection
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority

# Server
PORT=3000
NODE_ENV=development
APP_ADDRESS=http://localhost:3000

# JWT Secret (64+ characters recommended)
JWT_SECRET=your-super-secret-jwt-key-here

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Sepay Encryption (32 characters minimum)
SEPAY_ENCRYPTION_KEY=your-32-character-secret-key!!

# Frontend URL (CORS)
FRONTEND_URL=http://localhost:5173
```

### Cloudinary Setup

1. Đăng ký tài khoản tại: https://cloudinary.com
2. Vào Dashboard → Copy credentials
3. Thêm vào `.env`

### MongoDB Atlas Setup

1. Tạo cluster tại: https://cloud.mongodb.com
2. Tạo database user
3. Whitelist IP: `0.0.0.0/0` (hoặc IP cụ thể)
4. Copy connection string → `.env`

---

## 📚 API Documentation

### Base URL
```
Development: http://localhost:3000/api
Production: https://smart-shelf-server-backend.onrender.com/api
```

### Swagger UI
```
http://localhost:3000/api-docs
```

### Main Endpoints

#### 🔐 Authentication
```http
POST   /api/users/register    # Đăng ký user mới
POST   /api/users/login        # Đăng nhập
GET    /api/users/profile      # Lấy profile (require auth)
```

#### 📦 Products
```http
GET    /api/products           # Danh sách sản phẩm
POST   /api/products           # Tạo sản phẩm (with image upload)
GET    /api/products/:id       # Chi tiết sản phẩm
PUT    /api/products/:id       # Cập nhật sản phẩm
DELETE /api/products/:id       # Xóa sản phẩm
```

#### 🏪 Shelves
```http
GET    /api/shelves            # Danh sách kệ
POST   /api/shelves            # Tạo kệ mới (auto-create 15 load cells + QR)
GET    /api/shelves/:id        # Chi tiết kệ
PATCH  /api/shelves/:id        # Cập nhật kệ
DELETE /api/shelves/:id        # Xóa kệ
```

#### 💳 Sepay Config
```http
GET    /api/sepay-config                  # Lấy config chung
GET    /api/sepay-config/shelf/:shelfId   # Config theo shelf
PUT    /api/sepay-config                  # Tạo/update config
PUT    /api/sepay-config/shelf/:shelfId   # Config cho shelf
DELETE /api/sepay-config/:id              # Xóa config
```

#### 📋 Orders
```http
GET    /api/orders             # Danh sách đơn hàng
POST   /api/orders             # Tạo đơn hàng
GET    /api/orders/:id         # Chi tiết đơn hàng
PUT    /api/orders/:id         # Cập nhật đơn hàng
DELETE /api/orders/:id         # Xóa đơn hàng
```

#### 🔔 Notifications
```http
GET    /api/notifications      # Danh sách thông báo
POST   /api/notifications      # Tạo thông báo
DELETE /api/notifications/:id  # Xóa thông báo
```

#### 🎁 Combos
```http
GET    /api/combos             # Danh sách combo
POST   /api/combos             # Tạo combo
GET    /api/combos/:id         # Chi tiết combo
PUT    /api/combos/:id         # Cập nhật combo
DELETE /api/combos/:id         # Xóa combo
```

### Chi tiết đầy đủ
- **API Docs:** `/api-docs` (Swagger UI)
- **Sepay Config:** [SEPAY_API_DOCS.md](SEPAY_API_DOCS.md)
- **Deploy Guide:** [DEPLOY_GUIDE.md](DEPLOY_GUIDE.md)

---

## 🌐 Deployment

### Deploy lên Render

1. **Push code lên GitHub:**
```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

2. **Tạo Web Service trên Render:**
   - New → Web Service
   - Connect GitHub repository
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Environment: Node

3. **Add Environment Variables:**
   - Copy tất cả từ `.env`
   - Paste vào Render Dashboard → Environment

4. **Deploy:**
   - Click "Create Web Service"
   - Đợi ~3-5 phút
   - URL: `https://your-app.onrender.com`

**Chi tiết:** Xem [DEPLOY_GUIDE.md](DEPLOY_GUIDE.md)

### Auto-Deploy
Mỗi khi push lên `main` branch, Render tự động rebuild và deploy.

---

## 🔒 Security

### Implemented Features

✅ **Password Security:**
- Bcrypt hashing (salt rounds: 10)
- Không lưu plain text passwords

✅ **JWT Authentication:**
- Signed tokens với secret key
- Token expiration
- Middleware verification

✅ **Data Encryption:**
- AES-256-CBC cho Sepay tokens
- Environment-based encryption keys
- Auto encrypt/decrypt

✅ **API Security:**
- CORS configuration
- Rate limiting (recommended)
- Input validation
- MongoDB injection prevention

✅ **Environment Security:**
- `.env` trong `.gitignore`
- Separate dev/prod configs
- Secure credential storage

### Best Practices

⚠️ **Trước khi deploy production:**

1. Đổi `JWT_SECRET` thành chuỗi random dài (64+ chars)
2. Đổi `SEPAY_ENCRYPTION_KEY` thành key mạnh
3. Sử dụng strong MongoDB password
4. Enable MongoDB IP whitelist
5. Set `NODE_ENV=production`
6. Review CORS origins

---

## 🧪 Testing

### Manual Testing
```bash
# Start server
npm run dev

# Test health endpoint
curl http://localhost:3000/api/health

# Test with Postman
# Import Swagger JSON from /api-docs
```

---

## 📝 Scripts

```bash
npm start          # Production server
npm run dev        # Development with nodemon
```

---

## 🤝 Contributing

1. Fork repository
2. Create feature branch: `git checkout -b feature/AmazingFeature`
3. Commit changes: `git commit -m 'Add AmazingFeature'`
4. Push to branch: `git push origin feature/AmazingFeature`
5. Open Pull Request

---

## 📄 License

ISC License - xem file [LICENSE](LICENSE) để biết thêm chi tiết.

---

## 👥 Team

**CS17IUH Team**

---

## 🔗 Links

- **Frontend Repository:** [Link to FE repo]
- **Live API:** https://smart-shelf-server-backend.onrender.com
- **API Documentation:** https://smart-shelf-server-backend.onrender.com/api-docs
- **MongoDB Atlas:** https://cloud.mongodb.com
- **Cloudinary:** https://cloudinary.com

---

## 📞 Support

Nếu có vấn đề hoặc câu hỏi:
1. Mở issue trên GitHub
2. Kiểm tra logs trên Render Dashboard
3. Xem [DEPLOY_GUIDE.md](DEPLOY_GUIDE.md)

---

## 🎯 Roadmap

- [ ] Unit testing với Jest
- [ ] Integration testing
- [ ] Redis caching
- [ ] Rate limiting
- [ ] API versioning
- [ ] GraphQL support
- [ ] Docker containerization
- [ ] CI/CD pipeline

---

**Made with ❤️ by CS17IUH Team**
