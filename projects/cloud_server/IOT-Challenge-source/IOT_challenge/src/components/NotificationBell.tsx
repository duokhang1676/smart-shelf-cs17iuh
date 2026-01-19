import React, { useState, useEffect } from "react";
import {
  IconButton,
  Badge,
  Menu,
  MenuItem,
  Typography,
  Box,
  Divider,
  ListItemIcon,
  ListItemText,
  CircularProgress,
} from "@mui/material";
import {
  Notifications as NotificationsIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Error as ErrorIcon,
  CheckCircle as SuccessIcon,
} from "@mui/icons-material";
import {
  getAllNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  formatTimestamp,
  getNotificationIcon,
  type Notification,
} from "../service/notification.service";
import { io } from "socket.io-client";

const NotificationBell: React.FC = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch notifications when component mounts
  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
  }, []);

  useEffect(() => {
    // Kết nối socket
    const socket = io("http://localhost:3000"); // Đổi thành URL backend của bạn

    // Lắng nghe sự kiện notification mới
    socket.on("new-notification", (notification) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
    });

    // Cleanup khi unmount
    return () => {
      socket.disconnect();
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getAllNotifications(1, 20); // Get first 20 notifications
      console.log(response);

      setNotifications(response.notifications);
      console.log(notifications);
      
    } catch (err) {
      console.error("Error fetching notifications:", err);
      setError("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await getUnreadCount();
      console.log(response);
      
      setUnreadCount(response.data.unreadCount);
    } catch (err) {
      console.error("Error fetching unread count:", err);
    }
  };

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    // Refresh data when opening the menu
    fetchNotifications();
    fetchUnreadCount();
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = async (notificationId: string) => {
    try {
      // Mark as read on the server
      await markAsRead(notificationId);

      // Update local state
      setNotifications((prev) =>
        prev.map((n) => (n._id === notificationId ? { ...n, read: true } : n))
      );

      // Update unread count
      fetchUnreadCount();
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();

      // Update local state
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Error marking all notifications as read:", err);
    }
  };

  const getNotificationIconComponent = (type: Notification["type"]) => {
    switch (type) {
      case "warning":
        return <WarningIcon color="warning" />;
      case "error":
        return <ErrorIcon color="error" />;
      case "success":
        return <SuccessIcon color="success" />;
      case "info":
      default:
        return <InfoIcon color="info" />;
    }
  };

  return (
    <>
      <IconButton color="inherit" onClick={handleClick} sx={{ ml: 2 }}>
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: 400,
            maxHeight: 500,
          },
        }}
      >
        <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
          <Typography variant="h6">Notifications</Typography>
          <Typography variant="body2" color="text.secondary">
            {unreadCount} unread notifications
          </Typography>
        </Box>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
            <CircularProgress size={24} />
          </Box>
        ) : error ? (
          <MenuItem>
            <Typography variant="body2" color="error">
              {error}
            </Typography>
          </MenuItem>
        ) : notifications?.length === 0 ? (
          <MenuItem>
            <Typography variant="body2" color="text.secondary">
              No notifications
            </Typography>
          </MenuItem>
        ) : (
          notifications?.map((notification) => (
            <MenuItem
              key={notification._id}
              onClick={() => handleNotificationClick(notification._id)}
              sx={{
                backgroundColor: notification.read
                  ? "transparent"
                  : "action.hover",
                "&:hover": {
                  backgroundColor: "action.hover",
                },
              }}
            >
              <ListItemIcon>
                {getNotificationIconComponent(notification.type)}
              </ListItemIcon>
              <ListItemText
                primary={
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: notification.read ? "normal" : "bold",
                    }}
                  >
                    {notification.message}
                  </Typography>
                }
                secondary={
                  <Typography variant="caption" color="text.secondary">
                    {formatTimestamp(new Date(notification.timestamp))}
                  </Typography>
                }
              />
            </MenuItem>
          ))
        )}

        {notifications?.length > 0 && !loading && (
          <Box sx={{ p: 1, borderTop: 1, borderColor: "divider" }}>
            <Typography
              variant="body2"
              color="primary"
              sx={{ cursor: "pointer", textAlign: "center" }}
              onClick={handleMarkAllAsRead}
            >
              Mark all as read
            </Typography>
          </Box>
        )}
      </Menu>
    </>
  );
};

export default NotificationBell;
