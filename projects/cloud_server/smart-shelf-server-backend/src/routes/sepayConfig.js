const express = require('express');
const router = express.Router();
const sepayConfigController = require('../controller/sepayConfig.controller');

// GET routes
router.get('/', sepayConfigController.getConfig);
router.get('/shelf/:shelfId', sepayConfigController.getConfigByShelfId);

// PUT/POST routes
router.put('/', sepayConfigController.upsertConfig);
router.put('/shelf/:shelfId', sepayConfigController.upsertConfigByShelfId);
router.post('/shelf/:shelfId', sepayConfigController.upsertConfigByShelfId);

// DELETE routes
router.delete('/:id', sepayConfigController.deleteConfig);
router.delete('/shelf/:shelfId', sepayConfigController.deleteConfigByShelfId);

module.exports = router;