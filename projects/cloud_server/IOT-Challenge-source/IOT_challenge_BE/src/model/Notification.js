const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema({
  message: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ["warning", "error", "info", "success"],
    default: "info",
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  read: {
    type: Boolean,
    default: false,
  },
  // Optional: reference to related entities
  shelf_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Shelf",
  },
  load_cell_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "LoadCell",
  },
  product_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
}, {
  timestamps: true, // Adds createdAt and updatedAt fields
});

module.exports = mongoose.model("Notification", NotificationSchema); 