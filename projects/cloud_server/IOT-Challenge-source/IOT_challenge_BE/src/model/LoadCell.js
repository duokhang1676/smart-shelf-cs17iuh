const mongoose = require("mongoose");

const LoadCellSchema = new mongoose.Schema({
  load_cell_id: {
    type: Number,
    required: true,
  },
  load_cell_name: {
    type: String,
    required: true,
  },
  product_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
  },
  previous_product_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
  },
  shelf_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Shelf",
    required: true,
  },
  floor: {
    type: Number,
    required: true,
  },
  column: {
    type: Number,
    required: true,
  }, // cột
  threshold: {
    type: Number,
    required: true,
    default: 1,
  }, // ngưỡng hết hàng
  error: {
    type: Number,
    required: true,
    default: 0,
  },
});

module.exports = mongoose.model("LoadCell", LoadCellSchema);