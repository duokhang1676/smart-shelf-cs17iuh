const express = require('express');
const router = express.Router();
const oderController = require('../controller/order.controller');
const multer = require('multer');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// Only run multer when the request is multipart/form-data. If client sends
// application/json, skip multer so express.json() keeps req.body intact.
const conditionalMulter = (req, res, next) => {
  const ct = req.headers['content-type'] || '';
  if (ct.startsWith('multipart/form-data')) {
    return upload.fields([
      { name: 'receipt_image', maxCount: 1 },
      { name: 'customer_image', maxCount: 1 },
      { name: 'file',          maxCount: 1 },
    ])(req, res, next);
  }
  return next();
};

// Order
router.post('/', conditionalMulter, oderController.createOrderWithDetails);

router.get('/', oderController.getOrders);
router.get('/statistics/revenue', oderController.getRevenueStatistics);
router.get('/statistics/products', oderController.getProductSalesStatistics);
router.get('/statistics/top-products', oderController.getTopSellingProducts);
router.get('/:id', oderController.getOrderDetail);

module.exports = router;
