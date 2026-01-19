const express = require("express");
const router = express.Router();
const shelfController = require("../controller/shelf.controller");

// CRUD Shelf (chỉ cho Admin)
router.get("/", shelfController.getAllShelves);
router.get("/:id", shelfController.getShelfById);
router.post("/", shelfController.createShelf);
router.put("/:id", shelfController.updateShelf);
router.delete("/:id", shelfController.deleteShelf);
router.get("/get-loadcell/:shelfId", shelfController.getLoadsellByShelfId);
// Lấy danh sách sản phẩm trên load cell theo Shelf ID
router.get("/get-products/:shelfId", shelfController.getProductsByShelfId);
router.get("/get-employee/:shelfId", shelfController.getEmployee);
router.get("/get-qr/:shelfId", shelfController.getQR);

module.exports = router