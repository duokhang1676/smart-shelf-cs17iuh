const { publishMessage } = require('../config/mqtt');
const Notification = require('../model/Notification');

/**
 * Webhook endpoint nhận notification từ SePay khi có giao dịch chuyển khoản
 * POST /webhook/sepay-webhook
 */
exports.handleSepayWebhook = async (req, res) => {
  try {
    console.log('📥 Received SePay webhook:', JSON.stringify(req.body, null, 2));

    // Parse webhook payload từ SePay
    const {
      id,                    // Transaction ID từ SePay
      gateway,              // Tên ngân hàng
      transactionDate,      // Thời gian giao dịch
      accountNumber,        // Số tài khoản nhận tiền
      subAccount,          // Số phụ (nếu có)
      transferAmount,      // Số tiền chuyển khoản
      code,                // Mã giao dịch ngân hàng
      content,             // Nội dung chuyển khoản
      referenceCode,       // Mã tham chiếu
      description,         // Mô tả chi tiết
      transferType,        // Loại giao dịch (in/out)
      accumulated,         // Tổng tiền tích lũy
    } = req.body;

    // Validate required fields
    if (!content || !transferAmount) {
      console.error('❌ Missing required fields: content or transferAmount');
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: content or transferAmount'
      });
    }

    // Extract order_id từ content
    // Format: "Pay for snack machine OD1769552305" hoặc "ORDER_123456"
    const orderIdMatch = content.match(/OD\d+/i) || content.match(/ORDER[_\s]?\d+/i);
    const orderId = orderIdMatch ? orderIdMatch[0] : null;

    console.log(`🔍 Extracted Order ID: ${orderId || 'N/A'}`);

    // Prepare MQTT message payload
    const mqttPayload = {
      transaction_id: id,
      order_id: orderId,
      amount: transferAmount,
      transaction_content: content,
      bank: gateway,
      transaction_date: transactionDate,
      account_number: accountNumber,
      code: code || referenceCode,
      reference_code: referenceCode,
      transfer_type: transferType,
      description,
      status: 'success',
      timestamp: new Date().toISOString(),
    };

    // Publish to MQTT topic: payment/notification
    const topic = 'payment/notification';
    
    console.log(`📤 Publishing to MQTT topic: ${topic}`);
    console.log(`📦 Payload:`, JSON.stringify(mqttPayload, null, 2));
    
    await publishMessage(topic, mqttPayload);

    console.log(`✅ Payment notification published to MQTT successfully`);
    console.log(`   Order ID: ${orderId || 'N/A'}`);
    console.log(`   Amount: ${transferAmount} VND`);

    // Tạo notification cho thanh toán thành công
    try {
      const notification = await Notification.create({
        message: `Thanh toán thành công ${orderId || 'N/A'} - Số tiền: ${transferAmount.toLocaleString('vi-VN')}đ - Ngân hàng: ${gateway}`,
        type: 'success',
        category: 'order',
      });

      // Emit real-time notification qua Socket.IO nếu có
      const io = req.app.get('io');
      if (io) {
        io.emit('new-notification', notification);
      }
      
      console.log(`📢 Payment notification created in database`);
    } catch (notifErr) {
      console.error('Failed to create payment notification:', notifErr);
      // Không fail response
    }

    // Response to SePay
    res.status(200).json({
      success: true,
      message: 'Webhook received and forwarded to MQTT',
      data: {
        order_id: orderId,
        amount: transferAmount,
        transaction_id: id,
      }
    });

  } catch (error) {
    console.error('❌ Error handling SePay webhook:', error);
    console.error('Stack trace:', error.stack);
    
    // Vẫn trả về 200 để SePay không retry liên tục
    res.status(200).json({
      success: false,
      error: error.message,
      message: 'Webhook received but failed to process'
    });
  }
};

/**
 * Test endpoint để kiểm tra MQTT connection
 * POST /webhook/test-mqtt
 */
exports.testMQTT = async (req, res) => {
  try {
    const testPayload = {
      message: 'Test MQTT from backend',
      timestamp: new Date().toISOString(),
      ...req.body
    };

    const topic = req.body.topic || 'payment/notification';
    await publishMessage(topic, testPayload);

    res.json({
      success: true,
      message: `Test message published to topic: ${topic}`,
      payload: testPayload
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
