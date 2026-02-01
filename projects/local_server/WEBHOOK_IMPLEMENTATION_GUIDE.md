# Hướng dẫn Implement SePay Webhook cho Backend

## Mục tiêu
Tạo webhook endpoint trên cloud backend (Render) để nhận payment notification từ SePay và forward đến Jetson qua MQTT.

## Thông tin cấu hình

### Webhook URL đã đăng ký trên SePay:
```
https://smart-shelf-server-backend.onrender.com/webhook/sepay-webhook
```

### MQTT Broker Configuration:
- **Broker URL**: `broker.hivemq.com`
- **Port**: `8000` (WebSocket)
- **Topic**: `payment/notification`
- **Transport**: `websockets`

### Shelf ID:
```
48:b0:2d:3d:2b:28
```

---

## Implementation Steps

### 1. Install Dependencies

**Nếu backend dùng Node.js:**
```bash
npm install mqtt
```

**Nếu backend dùng Python:**
```bash
pip install paho-mqtt
```

---

### 2. Tạo Webhook Endpoint

#### **Node.js/Express Example:**

```javascript
// File: routes/webhook.js hoặc controllers/webhookController.js

const mqtt = require('mqtt');

// Connect to MQTT broker
const mqttClient = mqtt.connect('ws://broker.hivemq.com:8000/mqtt', {
    clientId: 'render_webhook_' + Math.random().toString(16).substr(2, 8)
});

mqttClient.on('connect', () => {
    console.log('[MQTT] Connected to HiveMQ broker');
});

mqttClient.on('error', (err) => {
    console.error('[MQTT] Connection error:', err);
});

// Webhook handler
const handleSepayWebhook = async (req, res) => {
    try {
        const data = req.body;
        console.log('[WEBHOOK] Received SePay notification:', data);
        
        // Extract transaction data
        const transaction = data.transaction || data;
        const transactionId = transaction.id;
        const amount = parseFloat(transaction.amount_in || 0);
        const content = transaction.transaction_content || '';
        const transactionDate = transaction.transaction_date || '';
        
        // Extract order_id from content (format: "Pay for snack machine OD1234567890")
        const orderIdMatch = content.match(/OD\d+/);
        if (!orderIdMatch) {
            console.log('[WEBHOOK] No order_id found in content:', content);
            return res.status(400).json({ 
                success: false, 
                message: 'No order_id in content' 
            });
        }
        
        const orderId = orderIdMatch[0];
        console.log(`[WEBHOOK] ✓ Payment detected for order: ${orderId}`);
        
        // Prepare MQTT message
        const paymentNotification = {
            shelf_id: "48:b0:2d:3d:2b:28",
            order_id: orderId,
            amount: amount,
            transaction_id: transactionId,
            content: content,
            transaction_date: transactionDate,
            timestamp: new Date().toISOString(),
            source: "webhook"
        };
        
        // Publish to MQTT
        mqttClient.publish(
            'payment/notification', 
            JSON.stringify(paymentNotification),
            { qos: 1 },
            (err) => {
                if (err) {
                    console.error('[MQTT] Publish error:', err);
                } else {
                    console.log(`[MQTT] Published payment notification for ${orderId}`);
                }
            }
        );
        
        // Return success to SePay
        return res.status(200).json({
            success: true,
            message: 'Webhook processed successfully',
            order_id: orderId
        });
        
    } catch (error) {
        console.error('[WEBHOOK] Error processing webhook:', error);
        return res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};

module.exports = {
    handleSepayWebhook
};
```

**Register route trong app.js/server.js:**
```javascript
const webhookController = require('./controllers/webhookController');

// Webhook route
app.post('/webhook/sepay-webhook', webhookController.handleSepayWebhook);
```

---

#### **Python/Flask Example:**

```python
# File: routes/webhook_routes.py

from flask import Blueprint, request, jsonify
import paho.mqtt.client as mqtt
import json
import re
from datetime import datetime

webhook_bp = Blueprint('webhook', __name__)

# MQTT Client
mqtt_client = None

def get_mqtt_client():
    """Get or create MQTT client"""
    global mqtt_client
    if mqtt_client is None:
        try:
            mqtt_client = mqtt.Client(
                client_id="render_webhook",
                transport="websockets"
            )
            mqtt_client.connect("broker.hivemq.com", 8000, 60)
            mqtt_client.loop_start()
            print("[MQTT] Connected to HiveMQ broker")
        except Exception as e:
            print(f"[MQTT] Connection error: {e}")
            mqtt_client = None
    return mqtt_client

@webhook_bp.route('/sepay-webhook', methods=['POST'])
def sepay_webhook():
    """Handle SePay webhook notifications"""
    try:
        data = request.get_json()
        print(f"[WEBHOOK] Received SePay notification: {data}")
        
        # Extract transaction data
        transaction = data.get('transaction', data)
        transaction_id = transaction.get('id')
        amount = float(transaction.get('amount_in', 0))
        content = transaction.get('transaction_content', '')
        transaction_date = transaction.get('transaction_date', '')
        
        # Extract order_id from content
        match = re.search(r'OD\d+', content)
        if not match:
            print(f"[WEBHOOK] No order_id found in content: {content}")
            return jsonify({
                'success': False,
                'message': 'No order_id in content'
            }), 400
        
        order_id = match.group(0)
        print(f"[WEBHOOK] ✓ Payment detected for order: {order_id}")
        
        # Prepare MQTT message
        payment_notification = {
            "shelf_id": "48:b0:2d:3d:2b:28",
            "order_id": order_id,
            "amount": amount,
            "transaction_id": transaction_id,
            "content": content,
            "transaction_date": transaction_date,
            "timestamp": datetime.now().isoformat(),
            "source": "webhook"
        }
        
        # Publish to MQTT
        client = get_mqtt_client()
        if client:
            client.publish(
                'payment/notification',
                json.dumps(payment_notification),
                qos=1
            )
            print(f"[MQTT] Published payment notification for {order_id}")
        else:
            print("[MQTT] Client not available")
        
        # Return success to SePay
        return jsonify({
            'success': True,
            'message': 'Webhook processed successfully',
            'order_id': order_id
        }), 200
        
    except Exception as e:
        print(f"[WEBHOOK] Error processing webhook: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500
```

**Register blueprint trong app.py:**
```python
from routes.webhook_routes import webhook_bp

app.register_blueprint(webhook_bp, url_prefix='/webhook')
```

---

### 3. Test Webhook Endpoint

**Test với curl:**
```bash
curl -X POST https://smart-shelf-server-backend.onrender.com/webhook/sepay-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "transaction": {
      "id": "test123",
      "amount_in": 7000,
      "transaction_content": "116102861987 Pay for snack machine OD1234567890 CHUYEN TIEN",
      "transaction_date": "2026-01-28 10:30:00"
    }
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Webhook processed successfully",
  "order_id": "OD1234567890"
}
```

**Check Render logs:**
```
[WEBHOOK] Received SePay notification: {...}
[WEBHOOK] ✓ Payment detected for order: OD1234567890
[MQTT] Published payment notification for OD1234567890
```

---

### 4. Deploy to Render

**Commit và push code:**
```bash
git add .
git commit -m "feat: Add SePay webhook endpoint with MQTT forwarding"
git push origin main
```

Render sẽ tự động deploy.

---

### 5. Verify Integration

**Kiểm tra toàn bộ luồng:**

1. ✅ SePay gửi webhook → `https://smart-shelf-server-backend.onrender.com/webhook/sepay-webhook`
2. ✅ Backend nhận webhook → Log: `[WEBHOOK] Received SePay notification`
3. ✅ Backend publish MQTT → Log: `[MQTT] Published payment notification`
4. ✅ Jetson subscribe MQTT → Log: `[PAYMENT WEBHOOK] Received payment notification`
5. ✅ Jetson emit WebSocket → Frontend hiển thị "Thanh toán thành công"

**Timeline:**
- Trước: 24 giây (81 lần check polling)
- Sau: < 2 giây (webhook + MQTT real-time)

---

## Troubleshooting

### Webhook không nhận được request từ SePay
- Kiểm tra URL đã đúng: `https://smart-shelf-server-backend.onrender.com/webhook/sepay-webhook`
- Kiểm tra Render service đang chạy (không sleep)
- Kiểm tra logs trên Render Dashboard

### MQTT publish thất bại
- Kiểm tra broker URL: `broker.hivemq.com:8000`
- Kiểm tra transport: `websockets`
- Kiểm tra connection status trong logs

### Jetson không nhận được notification
- Kiểm tra Jetson đã subscribe topic: `payment/notification`
- Kiểm tra MQTT client đang chạy trên Jetson
- Kiểm tra shelf_id khớp: `48:b0:2d:3d:2b:28`

---

## Security Notes

**Optional: Webhook signature validation**

Nếu SePay cung cấp signature header, thêm validation:

```javascript
const crypto = require('crypto');

function validateSignature(payload, signature, secret) {
    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');
    
    return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
    );
}

// In webhook handler:
const signature = req.headers['x-sepay-signature'];
if (signature && !validateSignature(req.body, signature, WEBHOOK_SECRET)) {
    return res.status(401).json({ success: false, message: 'Invalid signature' });
}
```

---

## Summary

✅ Webhook endpoint nhận POST request từ SePay
✅ Parse transaction data và extract order_id
✅ Publish MQTT message đến topic `payment/notification`
✅ Jetson subscribe MQTT và nhận notification real-time
✅ Frontend hiển thị thành công trong < 2 giây

**Kết quả:** Giảm 90% thời gian phát hiện thanh toán (24s → 2s) 🚀
