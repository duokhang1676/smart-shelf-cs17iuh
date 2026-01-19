const mongoose = require("mongoose");
const { Schema } = mongoose;

const ComboSchema = new Schema(
  {
    // optional external numeric id from sample
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },

    image: { type: String, default: "" },

    // pricing
    price: { type: Number, required: true, min: 0 },
    oldPrice: { type: Number, required: true, min: 0 },

    // validity window
    validFrom: { type: Date },
    validTo: { type: Date },

    products: [{ type: Schema.Types.ObjectId, ref: "Product" }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Combo", ComboSchema);