// src/model/Oder.js
const mongoose = require('mongoose');

const OderSchema = new mongoose.Schema({
  order_code: { type: String, required: true, unique: true },
  shelf_id:   { type: String, required: true },
  total_bill: { type: Number, required: true },
  status: {
    type: String,
    enum: ['pending', 'unpaid', 'paid', 'cancelled'],
    default: 'pending'
  },
  customer_image: {type: String, require: true}
}, { timestamps: true });

module.exports = mongoose.model('Oder', OderSchema);
