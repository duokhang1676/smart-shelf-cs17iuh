const mongoose = require("mongoose");
const History = require("../model/History");
const Product = require("../model/Product");
const User = require("../model/User");
const LoadCell = require("../model/LoadCell");

// POST /api/histories
exports.createHistory = async (req, res) => {
  const session = await mongoose.startSession();
  let createdHistory = null;

  try {
    await session.withTransaction(async () => {
      const rfid = req.body.user_rfid;
      // tìm user bằng await và trong cùng session
      const user = await User.findOne({ rfid }).session(session);

      if (!user) {
        // ném lỗi để abort transaction và xử lý ở catch ngoài
        const err = new Error("Can not find user");
        err.status = 404;
        throw err;
      }

      const payload = {
        notes: req.body.notes ?? "",
        shelf: req.body.shelf,
        user: user._id,
        pre_products: Array.isArray(req.body.pre_products) ? req.body.pre_products : (req.body.pre_products ? [req.body.pre_products] : []),
        post_products: Array.isArray(req.body.post_products) ? req.body.post_products : (req.body.post_products ? [req.body.post_products] : []),
        pre_verified_quantity: Array.isArray(req.body.pre_verified_quantity) ? req.body.pre_verified_quantity : (req.body.pre_verified_quantity ? [req.body.pre_verified_quantity] : []),
        post_verified_quantity: Array.isArray(req.body.post_verified_quantity) ? req.body.post_verified_quantity : (req.body.post_verified_quantity ? [req.body.post_verified_quantity] : []),
      };

      // create history inside transaction
      const histDoc = new History(payload);
      createdHistory = await histDoc.save({ session });

      // If there are post_products and corresponding quantities, decrement product stock
      const postProducts = payload.post_products || [];
      const postQtys = payload.post_verified_quantity || [];

      for (let i = 0; i < postProducts.length; i++) {
        const prod = postProducts[i];
        const prodId = (typeof prod === "object" && prod !== null) ? (prod._id ?? prod.product_id ?? prod.id) : prod;
        const qtyRaw = Array.isArray(postQtys) ? postQtys[i] : postQtys;
        const qty = Math.max(0, Number(qtyRaw || 0));

        if (!prodId || qty === 0) continue;

        // decrement stock atomically and ensure non-negative
        const updated = await Product.findByIdAndUpdate(
          prodId,
          { $inc: { stock: -qty } },
          { new: true, session }
        );

        // If stock became negative (schema doesn't prevent), clamp to 0
        if (updated && typeof updated.stock === "number" && updated.stock < 0) {
          await Product.findByIdAndUpdate(prodId, { $set: { stock: 0 } }, { session });
        }
      }
    }); // end transaction

    const shelf_id = req.body.shelf;
    const loadCells = LoadCell.find({shelf_id});
    await LoadCell.updateMany(
      { shelf_id },
      { $set: { previous_product_id: null } }
    );
    
    session.endSession();

    // populate created history for response
    const populated = await History.findById(createdHistory._id)
      .populate("shelf")
      .populate("user")
      .populate("pre_products")
      .populate("post_products")
      .lean();

    res.status(201).json({ success: true, data: populated, message: "History created and product stocks updated" });
  } catch (err) {
    try { session.endSession(); } catch (e) {}
    // trả về 404 nếu lỗi do không tìm thấy user
    if (err && err.status === 404) {
      return res.status(404).json({ success: false, error: "Can not find user" });
    }
    res.status(400).json({ success: false, error: "Failed to create history", message: err.message });
  }
};

// GET /api/histories
exports.getHistories = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.min(100, parseInt(req.query.limit || "20", 10));
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.shelfId) filter.shelf = req.query.shelfId;
    if (req.query.userId) filter.user = req.query.userId;
    if (req.query.from || req.query.to) {
      filter.createdAt = {};
      if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
      if (req.query.to) filter.createdAt.$lte = new Date(req.query.to);
    }

    const [items, total] = await Promise.all([
      History.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("shelf")
        .populate("user")
        .populate("pre_products")
        .populate("post_products")
        .lean(),
      History.countDocuments(filter),
    ]);

    res.status(200).json({ success: true, data: items, meta: { page, limit, total } });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to fetch histories", message: err.message });
  }
};

// GET /api/histories/:id
exports.getHistoryById = async (req, res) => {
  try {
    const h = await History.findById(req.params.id)
      .populate("shelf")
      .populate("user")
      .populate("pre_products")
      .populate("post_products")
      .lean();
    if (!h) return res.status(404).json({ success: false, error: "History not found" });
    res.json({ success: true, data: h });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to fetch history", message: err.message });
  }
};

// PATCH /api/histories/:id
exports.updateHistory = async (req, res) => {
  try {
    const payload = {};
    if (req.body.notes !== undefined) payload.notes = req.body.notes;
    if (req.body.shelf !== undefined) payload.shelf = Array.isArray(req.body.shelf) ? req.body.shelf : [req.body.shelf];
    if (req.body.user !== undefined) payload.user = Array.isArray(req.body.user) ? req.body.user : [req.body.user];
    if (req.body.pre_products !== undefined) payload.pre_products = Array.isArray(req.body.pre_products) ? req.body.pre_products : [req.body.pre_products];
    if (req.body.post_products !== undefined) payload.post_products = Array.isArray(req.body.post_products) ? req.body.post_products : [req.body.post_products];
    if (req.body.pre_verified_quantity !== undefined) payload.pre_verified_quantity = req.body.pre_verified_quantity;
    if (req.body.post_verified_quantity !== undefined) payload.post_verified_quantity = req.body.post_verified_quantity;

    const updated = await History.findByIdAndUpdate(req.params.id, payload, { new: true })
      .populate("shelf")
      .populate("user")
      .populate("pre_products")
      .populate("post_products")
      .lean();

    if (!updated) return res.status(404).json({ success: false, error: "History not found" });
    res.json({ success: true, data: updated, message: "History updated" });
  } catch (err) {
    res.status(400).json({ success: false, error: "Failed to update history", message: err.message });
  }
};

// DELETE /api/histories/:id
exports.deleteHistory = async (req, res) => {
  try {
    const removed = await History.findByIdAndDelete(req.params.id).lean();
    if (!removed) return res.status(404).json({ success: false, error: "History not found" });
    res.json({ success: true, message: "History deleted", data: removed });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to delete history", message: err.message });
  }
};