const express = require('express');
const router = express.Router();
const webhookController = require('../controller/webhook.controller');

// SePay webhook endpoint
router.post('/sepay-webhook', webhookController.handleSepayWebhook);

// Test MQTT endpoint
router.post('/test-mqtt', webhookController.testMQTT);

module.exports = router;
