const express = require("express");
const router = express.Router();
const {
  createNotification,
  getAllNotifications,
  getNotificationById,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount,
} = require("../controller/notification.controller");


// Create a new notification
router.post("/", createNotification);

// Get all notifications with pagination and filtering
router.get("/", getAllNotifications);

// Get unread notifications count
router.get("/unread-count", getUnreadCount);

// Get notification by ID
router.get("/:id", getNotificationById);

// Mark notification as read
router.patch("/:id/read", markAsRead);

// Mark all notifications as read
router.patch("/mark-all-read", markAllAsRead);

// Delete notification
router.delete("/:id", deleteNotification);

router.post('/test', (req, res) => {
  const io = req.app.get('io');
  const payload = {
    message: req.body?.message ?? 'Bạn có thông báo mới',
    type: req.body?.type ?? 'info',    // info | warning | success | error
    shelf_id: req.body?.shelf_id ?? '',
    extra: req.body?.extra ?? {},
    timestamp: Date.now(),
  };
  
  if (io) io.emit('new-notification', payload);
  return res.json({ ok: true, sent: payload });
});

module.exports = router; 