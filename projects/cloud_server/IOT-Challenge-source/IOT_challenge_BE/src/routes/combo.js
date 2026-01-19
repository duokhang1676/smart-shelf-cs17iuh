const express = require("express");
const router = express.Router();
const controller = require("../controller/combo.controller");
const upload = require("../middleware/upload");

// endpoints
router.get("/", controller.getCombos);
router.post("/", upload, controller.createCombo);
router.get("/:id", controller.getComboById);
router.put("/:id", upload, controller.updateCombo);
router.delete("/:id", controller.deleteCombo);

module.exports = router;