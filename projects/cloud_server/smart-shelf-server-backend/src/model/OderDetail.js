const mongoose = require('mongoose');

const OderDetailSchema = new mongoose.Schema(
  {
    order_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Oder', // trỏ tới model Oder
      required: true,
    },
    product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product', // trỏ tới model Product
      required: true,
    },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    total_price: { type: Number, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('OderDetail', OderDetailSchema);