const Notification = require("../model/Notification");
const Product = require("../model/Product");
const Shelf = require("../model/Shelf");

// Create a new notification
const createNotification = async (req, res) => {
  try {
    const io = req.app.get('io');

    const notification = new Notification(req.body);
    const savedNotification = await notification.save();
    if (io) io.emit('new-notification', savedNotification);

    res.status(201).json({
      success: true,
      data: savedNotification,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Get all notifications
const getAllNotifications = async (req, res) => {
  try {
    const {
      page = 1, limit = 10, read, type
    } = req.query;

    let query = {};

    // Filter by read status
    if (read !== undefined) {
      query.read = read === 'true';
    }

    // Filter by type
    if (type) {
      query.type = type;
    }

    const notifications = await Notification.find(query)
      .populate('shelf_id', 'shelf_name')
      .populate('load_cell_id', 'load_cell_name')
      .populate('product_id', 'product_name')
      .populate('user_id', 'username')
      .sort({
        timestamp: -1
      })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Notification.countDocuments(query);

    res.status(200).json({
      success: true,
      data: notifications,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get notification by ID
const getNotificationById = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id)
      .populate('shelf_id', 'shelf_name')
      .populate('load_cell_id', 'load_cell_name')
      .populate('product_id', 'product_name')
      .populate('user_id', 'username');

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    res.status(200).json({
      success: true,
      data: notification,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Mark notification as read
const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id, {
        read: true
      }, {
        new: true
      }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    res.status(200).json({
      success: true,
      data: notification,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Mark all notifications as read
const markAllAsRead = async (req, res) => {
  try {
    const result = await Notification.updateMany({
      read: false
    }, {
      read: true
    });

    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} notifications marked as read`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete notification
const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findByIdAndDelete(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Notification deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get unread notifications count
const getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      read: false
    });

    res.status(200).json({
      success: true,
      data: {
        unreadCount: count
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Tạo notification khi loadcell quantity <= threshold
 * @param {Object} loadcell - Đối tượng LoadCell (mongoose document)
 * @param {Object} [io] - (Optional) Socket.IO instance để emit realtime
 */
const createLowQuantityNotification = async (loadcell, io) => {
  if (loadcell.quantity <= loadcell.threshold) {
    // Kiểm tra đã có notification cảnh báo cho loadcell này chưa (tránh spam)
    const existed = await Notification.findOne({
      load_cell_id: loadcell._id,
      type: "warning",
      read: false,
      message: {
        $regex: "run out of goods"
      }
    });
    if (existed) return; // Đã có cảnh báo chưa đọc, không tạo thêm

    // Lấy thông tin kệ và sản phẩm
    let shelfName = "Shelf";
    let floor = "?";
    let column = "?";
    let productName = "Product";
    if (loadcell.shelf_id) {
      const shelf = await Shelf.findById(loadcell.shelf_id);
      if (shelf) {
        shelfName = shelf.shelf_code || shelf.shelf_name || "Shelf";
        floor = loadcell.floor !== undefined ? loadcell.floor : "?";
        column = loadcell.column !== undefined ? loadcell.column : "?";
      }
    }
    if (loadcell.product_id) {
      const product = await Product.findById(loadcell.product_id);
      if (product && product.product_name) productName = product.product_name;
    }

    let message = "";
    if (loadcell.quantity === 0) {
      message = `[${floor}:${column}] of ${shelfName}: ran out of goods`;
    } else {
      message = `[${floor}:${column}] of ${shelfName}: about to run out of goods`;
    }

    const notification = await Notification.create({
      message,
      type: "warning",
      load_cell_id: loadcell._id,
      shelf_id: loadcell.shelf_id,
      product_id: loadcell.product_id,
      // Thêm các trường khác nếu cần
    });

    // Nếu có io (socket), emit realtime
    if (io) {
      io.emit('new-notification', notification);
    }
  }
};

module.exports = {
  createNotification,
  getAllNotifications,
  getNotificationById,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount,
  createLowQuantityNotification, // <-- export thêm hàm này
};