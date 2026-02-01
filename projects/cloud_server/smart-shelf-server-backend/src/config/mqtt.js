const mqtt = require('mqtt');
const Notification = require('../model/Notification');
const Product = require('../model/Product');
const Shelf = require('../model/Shelf');
const LoadCell = require('../model/LoadCell');
const User = require('../model/User');
const { createLowQuantityNotification } = require('../controller/notification.controller');

// HiveMQ Cloud broker configuration
const MQTT_CONFIG = {
  host: process.env.MQTT_BROKER_URL || 'broker.hivemq.com',
  port: process.env.MQTT_BROKER_PORT || 8000,
  protocol: 'ws',
  clientId: `smart_shelf_backend_${Math.random().toString(16).slice(3)}`,
  clean: true,
  connectTimeout: 4000,
  reconnectPeriod: 1000,
};

const TOPICS = {
  LOADCELL: 'shelf/loadcell/quantity',
  SENSOR: 'shelf/sensor/environment',
  SHELF_STATUS: 'shelf/status/data',
  UNPAID_CUSTOMER: 'shelf/tracking/unpaid_customer',
  PAYMENT: 'payment/notification',
  PRODUCT_ADDED: 'shelf/product/added',
};

let mqttClient = null;
let ioInstance = null;

function setIoInstance(io) {
  ioInstance = io;
}

function connectMQTT() {
  if (mqttClient && mqttClient.connected) {
    return mqttClient;
  }

  const brokerUrl = `${MQTT_CONFIG.protocol}://${MQTT_CONFIG.host}:${MQTT_CONFIG.port}/mqtt`;
  
  console.log(`🔌 Connecting to MQTT broker: ${brokerUrl}`);
  
  mqttClient = mqtt.connect(brokerUrl, {
    clientId: MQTT_CONFIG.clientId,
    clean: MQTT_CONFIG.clean,
    connectTimeout: MQTT_CONFIG.connectTimeout,
    reconnectPeriod: MQTT_CONFIG.reconnectPeriod,
  });

  mqttClient.on('connect', () => {
    console.log('✅ MQTT connected successfully');
    
    // Subscribe to all topics
    Object.values(TOPICS).forEach(topic => {
      mqttClient.subscribe(topic, (err) => {
        if (err) {
          console.error(`❌ Failed to subscribe to ${topic}:`, err);
        } else {
          console.log(`📡 Subscribed to ${topic}`);
        }
      });
    });
  });

  mqttClient.on('message', async (topic, message) => {
    try {
      const payload = JSON.parse(message.toString());
      console.log(`📨 Received on ${topic}:`, payload);

      switch (topic) {
        case TOPICS.LOADCELL:
          await handleLoadCellQuantity(payload);
          break;
        case TOPICS.SENSOR:
          await handleSensorEnvironment(payload);
          break;
        case TOPICS.SHELF_STATUS:
          await handleShelfStatus(payload);
          break;
        case TOPICS.UNPAID_CUSTOMER:
          await handleUnpaidCustomer(payload);
          break;
        case TOPICS.PAYMENT:
          await handlePaymentNotification(payload);
          break;
        case TOPICS.PRODUCT_ADDED:
          await handleProductAdded(payload);
          break;
        default:
          console.log('Unknown topic:', topic);
      }
    } catch (error) {
      console.error('❌ Error processing MQTT message:', error);
    }
  });

  mqttClient.on('error', (error) => {
    console.error('❌ MQTT connection error:', error);
  });

  mqttClient.on('offline', () => {
    console.log('⚠️ MQTT client offline');
  });

  mqttClient.on('reconnect', () => {
    console.log('🔄 MQTT reconnecting...');
  });

  return mqttClient;
}

async function handleLoadCellQuantity(payload) {
  if (payload && Array.isArray(payload.values)) {
    const quantities = payload.values.map(v => Number(v) || 0);
    const macIp = payload.id;
    if (macIp) {
      // Tìm shelf dựa trên mac_ip
      const shelf = await Shelf.findOne({ mac_ip: macIp });
      if (shelf) {
        const loadCells = await LoadCell.find({ shelf_id: shelf._id }).populate('product_id').sort({ floor: 1, column: 1 });
        loadCells.forEach(async (cell, index) => {
          if (quantities[index] !== undefined) {
            cell.quantity = quantities[index];
            await cell.save();
            // Check for notifications (bỏ qua nếu quantity = 255)
            // Lấy threshold từ Product thay vì LoadCell
            const threshold = cell.product_id?.threshold || 1;
            if (cell.quantity <= threshold && cell.quantity !== 255) {
              console.log('gửi');
              
              await createLowQuantityNotification(cell, ioInstance);
            }
          }
        });
      } else {
        console.log(`Shelf with mac_ip ${macIp} not found`);
      }
    }
  }
}

async function handleSensorEnvironment(payload) {
  // Không tạo cảnh báo môi trường
  return;
}

async function handleShelfStatus(payload) {
  const { status, shelf_id, message, shelf_status_lean, shelf_status_shake, date_time, id } = payload;
  
  let notificationMessage = message;
  let notificationType = status === 'error' ? 'error' : 'info';
  let category = 'general';
  
  if (shelf_status_lean === true) {
    notificationMessage = `Kệ bị nghiêng vào lúc ${date_time}`;
    notificationType = 'warning';
    category = 'vibration';
  } else if (shelf_status_shake === true) {
    notificationMessage = `Kệ bị rung lắc vào lúc ${date_time}`;
    notificationType = 'warning';
    category = 'vibration';
  } else if (status) {
    notificationMessage = message || `Trạng thái kệ ${shelf_id}: ${status}`;
  } else {
    // Nếu không có gì đặc biệt, có thể không tạo notification
    return;
  }
  
  const notification = new Notification({
    message: notificationMessage,
    type: notificationType,
    category,
    shelf_id,
  });
  await notification.save();
  if (ioInstance) ioInstance.emit('new-notification', notification);
}

async function handleUnpaidCustomer(payload) {
  const { customer_id, shelf_id, amount } = payload;
  const notification = new Notification({
    message: `Khách hàng ${customer_id} chưa thanh toán tại kệ ${shelf_id}, số tiền: ${amount}`,
    type: 'warning',
    category: 'order',
    shelf_id,
  });
  await notification.save();
  if (ioInstance) ioInstance.emit('new-notification', notification);
}

async function handlePaymentNotification(payload) {
  const { order_id, status, amount } = payload;
  const notification = new Notification({
    message: `Thanh toán cho đơn hàng ${order_id}: ${status}, số tiền: ${amount}`,
    type: status === 'success' ? 'info' : 'warning',
    category: 'order',
  });
  await notification.save();
  if (ioInstance) ioInstance.emit('new-notification', notification);
}

async function handleProductAdded(payload) {
  const { id: shelf_mac, event, rfid, verified_quantity, date_time } = payload;
  
  // Find shelf by MAC address to get ObjectId
  const shelf = await Shelf.findOne({ id: shelf_mac });
  if (!shelf) {
    console.warn(`⚠️ Shelf not found for MAC: ${shelf_mac}`);
    return;
  }
  
  // Find user by RFID
  const user = await User.findOne({ rfid });
  const employeeName = user ? (user.fullName || user.username) : `RFID ${rfid}`;
  
  const notification = new Notification({
    message: `Nhân viên ${employeeName} đã thêm sản phẩm vào kệ ${shelf.name || shelf_mac}, số lượng: ${verified_quantity} vào lúc ${date_time}`,
    type: 'info',
    category: 'restock',
    shelf_id: shelf._id, // Use ObjectId instead of MAC address
  });
  await notification.save();
  if (ioInstance) ioInstance.emit('new-notification', notification);
}

function getMQTTClient() {
  if (!mqttClient) {
    return connectMQTT();
  }
  return mqttClient;
}

function publishMessage(topic, message) {
  return new Promise((resolve, reject) => {
    const client = getMQTTClient();
    
    if (!client.connected) {
      return reject(new Error('MQTT client not connected'));
    }

    const payload = typeof message === 'string' ? message : JSON.stringify(message);
    
    client.publish(topic, payload, { qos: 1 }, (error) => {
      if (error) {
        console.error(`❌ Failed to publish to ${topic}:`, error);
        reject(error);
      } else {
        console.log(`📤 Published to ${topic}:`, payload);
        resolve();
      }
    });
  });
}

module.exports = {
  connectMQTT,
  getMQTTClient,
  publishMessage,
  setIoInstance,
};
