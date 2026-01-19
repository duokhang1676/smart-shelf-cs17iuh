const Poster = require("../model/Poster");
const path = require("path");

// GET /api/posters
exports.getAllPosters = async (req, res) => {
  try {
    const posters = await Poster.find().sort({ createdAt: -1 }).lean();
    res.status(200).json({ success: true, data: posters });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to fetch posters", message: err.message });
  }
};

// GET /api/posters/:id
exports.getPosterById = async (req, res) => {
  try {
    const poster = await Poster.findById(req.params.id).lean();
    if (!poster) return res.status(404).json({ success: false, error: "Poster not found" });
    res.status(200).json({ success: true, data: poster });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to fetch poster", message: err.message });
  }
};

// POST /api/posters  (accepts multipart/form-data via upload middleware OR JSON { image_url })
exports.createPoster = async (req, res) => {
  try {
    let image_url = "";

    // multer.fields puts files in req.files as arrays keyed by fieldname
    if (req.files && req.files.image && req.files.image[0]) {
      const file = req.files.image[0];
      image_url = `${req.protocol}://${req.get("host")}/uploads/${file.filename}`;
    } else if (req.body && req.body.image_url) {
      image_url = String(req.body.image_url).trim();
    }

    if (!image_url) return res.status(400).json({ success: false, error: "image_url or file is required" });

    const created = await Poster.create({ image_url });
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    res.status(400).json({ success: false, error: "Failed to create poster", message: err.message });
  }
};

// PATCH /api/posters/:id  (accepts multipart/form-data via upload middleware OR JSON { image_url })
exports.updatePoster = async (req, res) => {
  try {
    const update = {};

    if (req.files && req.files.image && req.files.image[0]) {
      const file = req.files.image[0];
      update.image_url = `${req.protocol}://${req.get("host")}/uploads/${file.filename}`;
    } else if (req.body && req.body.image_url !== undefined) {
      update.image_url = String(req.body.image_url).trim();
    }

    const updated = await Poster.findByIdAndUpdate(req.params.id, update, { new: true }).lean();
    if (!updated) return res.status(404).json({ success: false, error: "Poster not found" });
    res.status(200).json({ success: true, data: updated });
  } catch (err) {
    res.status(400).json({ success: false, error: "Failed to update poster", message: err.message });
  }
};

// DELETE /api/posters/:id
exports.deletePoster = async (req, res) => {
  try {
    const removed = await Poster.findByIdAndDelete(req.params.id).lean();
    if (!removed) return res.status(404).json({ success: false, error: "Poster not found" });
    res.status(200).json({ success: true, message: "Poster deleted", data: removed });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to delete poster", message: err.message });
  }
};