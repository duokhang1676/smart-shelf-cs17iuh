const express = require("express");
const router = express.Router();
const ctrl = require("../controller/poster.controller");
const upload = require("../middleware/upload"); // reuse existing middleware

// list
router.get("/", ctrl.getAllPosters);
// create (multipart/form-data with field "image" OR JSON body)
router.post("/", upload, ctrl.createPoster);
// get one
router.get("/:id", ctrl.getPosterById);
// update (multipart/form-data with field "image" OR JSON body)
router.patch("/:id", upload, ctrl.updatePoster);
// delete
router.delete("/:id", ctrl.deletePoster);

module.exports = router;