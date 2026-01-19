const express = require("express");
const router = express.Router();
const ctrl = require("../controller/history.controller");

// list / filter
router.get("/", ctrl.getHistories);
// create
router.post("/", ctrl.createHistory);
// get one
router.get("/:id", ctrl.getHistoryById);
// update
router.patch("/:id", ctrl.updateHistory);
// delete
router.delete("/:id", ctrl.deleteHistory);

module.exports = router;