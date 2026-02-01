const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();
require('dotenv').config();
const connectDB = require('./src/config/database')
const { connectMQTT, setIoInstance } = require('./src/config/mqtt');
// Thêm các dòng sau:
const http = require('http');
const server = http.createServer(app);
const {
  Server
} = require('socket.io');
const io = new Server(server, {
  cors: {
    origin: "*", // hoặc chỉ định domain FE
    methods: ["GET", "POST"],
    transports: ['websocket', 'polling'],
  }
});

io.on('connection', (socket) => {
  console.log('⚡ client connected:', socket.id);
  // (tuỳ chọn) socket.on('join', room => socket.join(room));
});

// Cho phép truy cập io từ controller
app.set('io', io);

// Thêm vào sau khi server khởi động
const swaggerUi = require("swagger-ui-express");
const swaggerFile = require("./swagger-output.json");

// CORS Configuration
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:8081',
  process.env.FRONTEND_URL,
  'https://*.vercel.app',
  'https://*.netlify.app'
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list or matches wildcard
    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed.includes('*')) {
        const regex = new RegExp(allowed.replace('*', '.*'));
        return regex.test(origin);
      }
      return allowed === origin;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(null, true); // For demo, allow all origins
    }
  },
  credentials: true
}));

app.use(express.json());
app.use(express.static('public'));

// Kết nối MongoDB
console.log(process.env.MONGO_URI);
connectDB()

// Set IO instance for MQTT
setIoInstance(io);

// Kết nối MQTT
connectMQTT();

// lưu raw body để debug (tùy chọn)
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  }
}));

app.use(express.json({
  limit: '10mb'
}));

app.use(express.urlencoded({
  extended: true
}));


// middleware bắt lỗi parse JSON
app.use((err, req, res, next) => {
  if (err && err.type === 'entity.parse.failed') {
    console.error('Invalid JSON payload:', err.message);
    console.error('Raw body:', req.rawBody);
    return res.status(400).json({
      success: false,
      error: 'Invalid JSON payload'
    });
  }
  next(err);
});

// Schema sản phẩm
const routes = require('./src/routes');
app.use('/api', routes);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerFile));

// Thay vì app.listen:
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));