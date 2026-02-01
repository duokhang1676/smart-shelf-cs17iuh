# Smart Shelf Management System - Frontend

Hệ thống quản lý kệ thông minh với tích hợp IoT, thanh toán tự động và giám sát thời gian thực.

## 📋 Mô tả

Frontend của hệ thống Smart Shelf được xây dựng với React + Vite, cung cấp giao diện quản lý kệ hàng thông minh với các tính năng:
- Giám sát thời gian thực qua MQTT/WebSocket
- Quản lý sản phẩm và kho hàng
- Tích hợp thanh toán VietQR/Sepay
- Dashboard thống kê và báo cáo
- Quản lý nhiệm vụ và nhân viên

## 🚀 Công nghệ sử dụng

- **React 19** - UI Library
- **TypeScript** - Type-safe JavaScript
- **Vite** - Build tool & Dev server
- **Material-UI (MUI)** - Component library
- **Redux Toolkit** - State management
- **React Router** - Client-side routing
- **MQTT.js** - IoT real-time messaging
- **Socket.IO Client** - WebSocket communication
- **Axios** - HTTP client
- **Recharts** - Data visualization
- **date-fns** - Date utilities

## 📦 Cài đặt

### Yêu cầu hệ thống
- Node.js 18+ 
- npm hoặc yarn

### Các bước cài đặt

1. Clone repository:
```bash
git clone <repository-url>
cd IOT_challenge
```

2. Cài đặt dependencies:
```bash
npm install
```

3. Cấu hình environment variables:
Tạo file `.env` trong thư mục gốc:
```env
VITE_API_ENDPOINT=https://your-backend-api.com/api
VITE_SOCKET_URL=https://your-backend-api.com
```

4. Chạy development server:
```bash
npm run dev
```

Ứng dụng sẽ chạy tại `http://localhost:5173`

## 🛠️ Scripts

```bash
# Development
npm run dev          # Chạy dev server với hot reload

# Production
npm run build        # Build ứng dụng cho production
npm run preview      # Preview bản build production

# Code Quality
npm run lint         # Chạy ESLint để kiểm tra code
```

## 📁 Cấu trúc thư mục

```
src/
├── assets/          # Static assets (images, icons)
├── components/      # Reusable React components
│   ├── AddShelfDialog.tsx
│   ├── HeaderBar.tsx
│   ├── MqttMessageViewer.tsx
│   ├── ProductCard.tsx
│   ├── ShelfInterface.tsx
│   └── ...
├── context/         # React Context providers
│   └── ShelfSidebarContext.tsx
├── layout/          # Layout components
│   └── MainLayout.tsx
├── lib/             # Utility libraries
│   ├── mqttClient.ts    # MQTT client configuration
│   └── useMqtt.ts       # MQTT custom hook
├── mock/            # Mock data for development
│   ├── productMockData.ts
│   ├── receiptMockData.ts
│   └── shelfMockData.ts
├── pages/           # Page components (routes)
│   ├── DashboardPage.tsx
│   ├── ShelfPage.tsx
│   ├── ProductPage.tsx
│   ├── ConfigPage.tsx
│   └── ...
├── service/         # API service layers
│   ├── auth.service.ts
│   ├── product.service.ts
│   ├── shelf.service.ts
│   ├── sepayConfig.service.ts
│   └── ...
├── store/           # Redux store configuration
│   ├── index.ts
│   ├── userSlice.ts
│   └── user.actions.ts
├── types/           # TypeScript type definitions
│   ├── selfTypes.ts
│   ├── userTypes.ts
│   ├── receiptTypes.ts
│   └── ...
├── App.tsx          # Root component
└── main.tsx         # Entry point
```

## 🔌 Tích hợp Backend API

### API Endpoints chính

```typescript
// Shelf Management
GET    /api/shelves
POST   /api/shelves
GET    /api/shelves/:id
PUT    /api/shelves/:id
DELETE /api/shelves/:id

// Product Management
GET    /api/products
POST   /api/products
PUT    /api/products/:id
DELETE /api/products/:id

// Sepay Configuration
GET    /api/sepay-config/shelf/:shelfId
POST   /api/sepay-config/shelf/:shelfId

// Load Cells (IoT Sensors)
GET    /api/loadcells/shelf/:shelfId
PUT    /api/loadcells/:id

// Receipts & Transactions
GET    /api/receipts
GET    /api/receipts/:id

// Users & Authentication
POST   /api/auth/login
GET    /api/users
POST   /api/users
```

## 🔐 Xác thực

Hệ thống sử dụng JWT authentication:
- Token được lưu trong localStorage
- Mỗi request API tự động gắn token vào header
- Redirect về login page khi token hết hạn

## 📊 MQTT Real-time Communication

Kết nối với MQTT broker để nhận dữ liệu thời gian thực từ cảm biến:

```typescript
// Broker mặc định: broker.hivemq.com:8884
// Protocol: WSS (WebSocket Secure)
// Topics subscribe:
- shelf/{shelfId}/loadcell/#
- shelf/{shelfId}/status
```

## 🎨 UI/UX Features

- **Responsive Design** - Tương thích mobile, tablet, desktop
- **Dark/Light Mode** - Hỗ trợ theme switching (nếu cấu hình)
- **Real-time Updates** - Cập nhật dữ liệu tức thời qua MQTT/WebSocket
- **Interactive Charts** - Biểu đồ thống kê với Recharts
- **Material Design** - Tuân thủ Material Design guidelines

## 🌐 Deployment

### Vercel (Khuyến nghị)

1. Push code lên GitHub
2. Import project vào Vercel
3. Cấu hình Environment Variables:
   - `VITE_API_ENDPOINT`
   - `VITE_SOCKET_URL`
4. Deploy!

### Docker

```bash
# Build Docker image
docker build -t smart-shelf-frontend .

# Run container
docker run -p 80:80 smart-shelf-frontend
```

### Manual Build

```bash
# Build static files
npm run build

# Files sẽ được tạo trong thư mục dist/
# Deploy folder dist/ lên hosting của bạn
```

## 🔧 Cấu hình

### Vite Config
File `vite.config.js` chứa cấu hình build và development server.

### Environment Variables
- `VITE_API_ENDPOINT` - URL của backend API
- `VITE_SOCKET_URL` - URL cho Socket.IO connection

### MQTT Configuration
Cấu hình MQTT broker trong `src/lib/mqttClient.ts`:
```typescript
{
  host: "broker.hivemq.com",
  port: 8884,
  path: "/mqtt",
  useSSL: true
}
```

## 📝 Sepay Payment Integration

Tích hợp thanh toán VietQR qua Sepay:

**Cấu hình Sepay** (Trang Config):
- Số tài khoản (vietqrAccountNo)
- Tên chủ tài khoản (vietqrAccountName)
- Đầu số thẻ ngân hàng (vietqrAcqId)
- API Token (sepayAuthToken)
- ID Token (sepayBankAccountId)

## 🐛 Troubleshooting

### CORS Issues
Đảm bảo backend đã cấu hình CORS cho phép origin của frontend.

### WebSocket Connection Failed
Kiểm tra:
- URL backend có hỗ trợ WSS
- Firewall không chặn port 8884 (MQTT)
- Certificate SSL hợp lệ

### Build Errors
```bash
# Clear cache và reinstall
rm -rf node_modules package-lock.json
npm install
```

## 📄 License

Apache 2.0

## 👥 Contributors

CS17IUH TEAM

## 📞 Support

Để được hỗ trợ, vui lòng tạo issue trên GitHub hoặc liên hệ team qua email duongkhang1676@gmail.com
