const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();
require('dotenv').config();
const connectDB = require('./src/config/database')
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

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Kết nối MongoDB
console.log(process.env.MONGO_URI);
connectDB()

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