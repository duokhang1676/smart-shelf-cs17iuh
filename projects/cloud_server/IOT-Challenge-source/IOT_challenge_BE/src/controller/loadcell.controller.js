const LoadCell = require("../model/LoadCell");
const Notification = require("../model/Notification");
const Product = require("../model/Product");
const {
  createLowQuantityNotification
} = require('./notification.controller');

// GET all
exports.getAllLoadCells = async (req, res) => {
  try {
    const data = await LoadCell.find();
    res.json(data);
  } catch (err) {
    res.status(500).json({
      error: "Server error",
    });
  }
};

// POST create
exports.createLoadCell = async (req, res) => {
  try {
    const loadCell = new LoadCell(req.body);
    const saved = await loadCell.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({
      error: "Invalid data",
    });
  }
};

// PUT update
exports.updateLoadCell = async (req, res) => {
  try {
    const {
      product_id,
      ...otherFields
    } = req.body;

    // Lấy thông tin loadcell hiện tại
    const loadCell = await LoadCell.findById(req.params.id);
    if (!loadCell) {
      return res.status(404).json({
        error: "LoadCell not found"
      });
    }

    // Cập nhật previous_product_id thành giá trị hiện tại của product_id
    const updateData = {
      ...otherFields,
      previous_product_id: loadCell.product_id || null, // Lưu giá trị cũ của product_id
      product_id: product_id || loadCell.product_id, // Cập nhật product_id từ request body
    };

    

    // Cập nhật loadcell
    const updated = await LoadCell.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
    });

    res.json(updated);
  } catch (err) {
    console.error("Error updating load cell:", err);
    res.status(400).json({
      error: "Update failed"
    });
  }
};

// DELETE
exports.deleteLoadCell = async (req, res) => {
  try {
    await LoadCell.findByIdAndDelete(req.params.id);
    res.json({
      message: "Deleted successfully",
    });
  } catch (err) {
    res.status(400).json({
      error: "Delete failed",
    });
  }
};

// PATCH: Update quantity and threshold
exports.updateQuantityAndThreshold = async (req, res) => {
  try {
    const {
      quantity,
      threshold
    } = req.body;
    const updateFields = {};
    if (quantity !== undefined) updateFields.quantity = quantity;
    if (threshold !== undefined) updateFields.threshold = threshold;

    const loadCell = await LoadCell.findByIdAndUpdate(
      req.params.id, {
        $set: updateFields
      }, {
        new: true
      }
    );

    if (!loadCell) {
      return res.status(404).json({
        error: "LoadCell not found"
      });
    }

    res.json(loadCell);
  } catch (err) {
    res.status(400).json({
      error: "Update failed"
    });
  }
};

// PATCH: Update shelf product quantity and product stock
exports.updateShelfProductQuantity = async (req, res) => {
  try {
    const {
      quantity
    } = req.body;
    if (quantity === undefined) {
      return res.status(400).json({
        error: "Missing quantity"
      });
    }

    // Lấy thông tin loadcell hiện tại
    const loadCell = await LoadCell.findById(req.params.id);
    if (!loadCell) {
      return res.status(404).json({
        error: "LoadCell not found"
      });
    }

    const oldQuantity = loadCell.quantity || 0;
    const quantityDiff = quantity - oldQuantity;

    // Cập nhật quantity của LoadCell
    loadCell.quantity = quantity;
    await loadCell.save();

    // Cập nhật stock của Product liên kết
    if (loadCell.product_id) {
      const product = await Product.findById(loadCell.product_id);
      if (product) {
        // Trừ số lượng lấy ra khỏi stock cũ
        product.stock = (product.stock || 0) - quantityDiff;
        // Đảm bảo stock không âm
        if (product.stock < 0) product.stock = 0;
        await product.save();
      }
    }

    // Gọi hàm tạo notification
    const io = req.app.get('io');
    await createLowQuantityNotification(loadCell, io);

    res.json({
      success: true,
      loadCell
    });
  } catch (err) {
    res.status(400).json({
      error: "Update failed"
    });
  }
};