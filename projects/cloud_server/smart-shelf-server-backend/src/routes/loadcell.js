const express = require("express");
const router = express.Router();
const loadcellController = require("../controller/loadcell.controller");
const { verifyToken, isAdmin } = require("../middleware/auth");

// CRUD Loadcell (chỉ cho Admin)
router.get("/", loadcellController.getAllLoadCells);
router.post("/", loadcellController.createLoadCell);
router.put("/:id", loadcellController.updateLoadCell);
router.delete("/:id", loadcellController.deleteLoadCell);
router.patch("/:id/quantity-threshold", loadcellController.updateQuantityAndThreshold);
router.patch("/:id/upload-quantity", loadcellController.updateShelfProductQuantity);

module.exports = router;
