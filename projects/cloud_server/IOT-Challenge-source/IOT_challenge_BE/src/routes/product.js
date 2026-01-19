const express = require('express');
const router = express.Router();
const productController = require('../controller/product.controller');
const upload = require('../middleware/upload');

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Lấy tất cả thông báo
 *     responses:
 *       200:
 *         description: Danh sách thông báo
 */
router.post('/', upload, productController.createProduct);
router.get('/', productController.getProducts);
router.get('/:id', productController.getProductById);
router.put('/:id', upload, productController.updateProduct);
router.delete('/:id', productController.deleteProduct);

module.exports = router;