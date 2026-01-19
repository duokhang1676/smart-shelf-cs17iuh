const mongoose = require("mongoose");
const { Schema } = mongoose;

const PosterSchema = new Schema(
  {
    // chỉ lưu url ảnh
    image_url: { type: String, required: true, trim: true },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model("Poster", PosterSchema);