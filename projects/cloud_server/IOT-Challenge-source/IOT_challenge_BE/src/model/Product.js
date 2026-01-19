const mongoose = require('mongoose');
const multer = require("multer");
const path = require("path");

const ProductSchema = new mongoose.Schema({
  product_id: {
    type: String,
  },
  product_name: {
    type: String,
    required: true
  },
  img_url: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  discount: {
    type: Number,
    required: true,
    default: 0
  },
  stock: {
    type: Number,
    required: true,
    default: 0
  },
  weight: {
    type: Number,
    required: true,
    default: 0
  },
  max_quantity: {
    type: Number,
    required: true,
    default: 1
  },
}, {
  timestamps: true
});

module.exports = mongoose.model('Product', ProductSchema);  