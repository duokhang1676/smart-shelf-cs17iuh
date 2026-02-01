import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  IconButton,
  CircularProgress,
  Alert,
  Stack,
  Divider,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemButton,
  Pagination,
  ToggleButtonGroup,
  ToggleButton,
  Tooltip,
} from "@mui/material";
import {
  Warning as WarningIcon,
  Info as InfoIcon,
  Error as ErrorIcon,
  CheckCircle as SuccessIcon,
  Notifications as NotificationsIcon,
  DoneAll as DoneAllIcon,
  Inventory as InventoryIcon,
  ShoppingCart as ShoppingCartIcon,
  Vibration as VibrationIcon,
  Receipt as ReceiptIcon,
  FilterList as FilterListIcon,
} from "@mui/icons-material";
import {
  getAllNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  formatTimestamp,
  type Notification,
} from "../service/notification.service";
import { io } from "socket.io-client";

// Phân loại thông báo dựa trên category từ backend hoặc nội dung message
const categorizeNotification = (notification: Notification) => {
  // Ưu tiên dùng category từ backend nếu có
  if (notification.category) {
    switch (notification.category) {
      case "vibration":
        return {
          category: "vibration",
          icon: <VibrationIcon />,
          color: "warning" as const,
          label: "Rung lắc kệ",
        };
      case "restock":
        return {
          category: "restock",
          icon: <InventoryIcon />,
          color: "success" as const,
          label: "Thêm hàng",
        };
      case "low_stock":
        return {
          category: "low_stock",
          icon: <WarningIcon />,
          color: "warning" as const,
          label: "Sắp hết hàng",
        };
      case "order":
        return {
          category: "order",
          icon: <ReceiptIcon />,
          color: "info" as const,
          label: "Hóa đơn",
        };
      default:
        return {
          category: "general",
          icon: <InfoIcon />,
          color: notification.type as "warning" | "error" | "success" | "info",
          label: "Khác",
        };
    }
  }
  
  // Fallback: phân loại dựa trên nội dung message
  const message = notification.message.toLowerCase();
  
  // Thông báo rung lắc kệ (từ MQTT)
  if (message.includes("vibration") || message.includes("shake") || message.includes("rung")) {
    return {
      category: "vibration",
      icon: <VibrationIcon />,
      color: "warning" as const,
      label: "Rung lắc kệ",
    };
  }
  
  // Thông báo nhân viên thêm hàng
  if (message.includes("added") || message.includes("thêm") || message.includes("restocked")) {
    return {
      category: "restock",
      icon: <InventoryIcon />,
      color: "success" as const,
      label: "Thêm hàng",
    };
  }
  
  // Thông báo sản phẩm sắp hết (low quantity)
  if (message.includes("out of goods") || message.includes("low") || message.includes("threshold") || message.includes("hết")) {
    return {
      category: "low_stock",
      icon: <WarningIcon />,
      color: "warning" as const,
      label: "Sắp hết hàng",
    };
  }
  
  // Thông báo hóa đơn mới
  if (message.includes("order") || message.includes("hóa đơn") || message.includes("payment") || message.includes("thanh toán")) {
    return {
      category: "order",
      icon: <ReceiptIcon />,
      color: "info" as const,
      label: "Hóa đơn",
    };
  }
  
  // Default
  return {
    category: "general",
    icon: <InfoIcon />,
    color: notification.type as "warning" | "error" | "success" | "info",
    label: "Khác",
  };
};

const NotificationPage: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [filter, setFilter] = useState<string>("all"); // all, vibration, restock, low_stock, order
  const limit = 15;

  // Fetch notifications when component mounts or page changes
  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
  }, [page]);

  // Socket.IO for real-time notifications
  useEffect(() => {
    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:3000";
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      secure: true,
      rejectUnauthorized: false
    });

    socket.on("new-notification", (notification: Notification) => {
      // Bỏ qua thông báo loadcell có giá trị 255
      const has255 = notification.message && notification.message.includes('255');
      const isLoadcellNotif = notification.message && (
        notification.message.includes('hết hàng') || 
        notification.message.includes('sắp hết') ||
        notification.category === 'low_stock'
      );
      
      if (has255 && isLoadcellNotif) {
        return; // Không thêm vào danh sách
      }
      
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getAllNotifications(page, limit);
      
      // Lọc bỏ các thông báo có chứa "255" (lỗi loadcell)
      const filteredNotifs = response.notifications.filter((n: Notification) => {
        // Kiểm tra nếu message có chứa số 255 và là thông báo về loadcell/hết hàng
        const has255 = n.message && n.message.includes('255');
        const isLoadcellNotif = n.message && (
          n.message.includes('hết hàng') || 
          n.message.includes('sắp hết') ||
          n.category === 'low_stock'
        );
        // Bỏ qua nếu là thông báo loadcell có giá trị 255
        if (has255 && isLoadcellNotif) {
          return false;
        }
        return true;
      });
      
      setNotifications(filteredNotifs);
      setTotalPages(response.totalPages);
    } catch (err) {
      console.error("Error fetching notifications:", err);
      setError("Không thể tải thông báo");
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await getUnreadCount();
      setUnreadCount(response.data.unreadCount);
    } catch (err) {
      console.error("Error fetching unread count:", err);
    }
  };

  const handleNotificationClick = async (notificationId: string) => {
    try {
      await markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n._id === notificationId ? { ...n, read: true } : n))
      );
      fetchUnreadCount();
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Error marking all notifications as read:", err);
    }
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  const handleFilterChange = (_event: React.MouseEvent<HTMLElement>, newFilter: string) => {
    if (newFilter !== null) {
      setFilter(newFilter);
      setPage(1); // Reset to first page when filter changes
    }
  };

  // Filter notifications based on selected category
  const filteredNotifications = notifications.filter((notification) => {
    if (filter === "all") return true;
    const category = categorizeNotification(notification);
    return category.category === filter;
  });

  const getNotificationIconComponent = (type: Notification["type"]) => {
    switch (type) {
      case "warning":
        return <WarningIcon sx={{ fontSize: 40 }} color="warning" />;
      case "error":
        return <ErrorIcon sx={{ fontSize: 40 }} color="error" />;
      case "success":
        return <SuccessIcon sx={{ fontSize: 40 }} color="success" />;
      case "info":
      default:
        return <InfoIcon sx={{ fontSize: 40 }} color="info" />;
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: "auto" }}>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: "bold", mb: 1 }}>
            <NotificationsIcon sx={{ fontSize: 40, mr: 1, verticalAlign: "middle" }} />
            Thông Báo
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : "Tất cả đã đọc"}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<DoneAllIcon />}
          onClick={handleMarkAllAsRead}
          disabled={unreadCount === 0}
          size="large"
        >
          Đánh dấu tất cả đã đọc
        </Button>
      </Box>

      {/* Filter Buttons */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
            <FilterListIcon color="action" />
            <ToggleButtonGroup
              value={filter}
              exclusive
              onChange={handleFilterChange}
              aria-label="notification filter"
              size="small"
            >
              <ToggleButton value="all">
                Tất cả ({notifications.length})
              </ToggleButton>
              <ToggleButton value="vibration">
                <VibrationIcon sx={{ mr: 0.5 }} />
                Rung lắc
              </ToggleButton>
              <ToggleButton value="low_stock">
                <WarningIcon sx={{ mr: 0.5 }} />
                Sắp hết
              </ToggleButton>
              <ToggleButton value="restock">
                <InventoryIcon sx={{ mr: 0.5 }} />
                Thêm hàng
              </ToggleButton>
              <ToggleButton value="order">
                <ReceiptIcon sx={{ mr: 0.5 }} />
                Hóa đơn
              </ToggleButton>
            </ToggleButtonGroup>
          </Stack>
        </CardContent>
      </Card>

      {/* Loading State */}
      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress size={40} />
        </Box>
      )}

      {/* Error State */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Notifications List */}
      {!loading && !error && (
        <>
          {filteredNotifications.length === 0 ? (
            <Card>
              <CardContent>
                <Box sx={{ textAlign: "center", py: 4 }}>
                  <NotificationsIcon sx={{ fontSize: 80, color: "text.disabled", mb: 2 }} />
                  <Typography variant="h6" color="text.secondary">
                    Không có thông báo
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          ) : (
            <List sx={{ bgcolor: "background.paper", borderRadius: 2 }}>
              {filteredNotifications.map((notification, index) => {
                const categoryInfo = categorizeNotification(notification);
                return (
                  <React.Fragment key={notification._id}>
                    <ListItem
                      disablePadding
                      sx={{
                        bgcolor: notification.read ? "transparent" : "action.hover",
                        borderLeft: notification.read ? "none" : "4px solid",
                        borderLeftColor: `${categoryInfo.color}.main`,
                      }}
                    >
                      <ListItemButton
                        onClick={() => handleNotificationClick(notification._id)}
                        sx={{ py: 2, px: 3 }}
                      >
                        <ListItemAvatar>
                          <Avatar
                            sx={{
                              bgcolor: `${categoryInfo.color}.light`,
                              color: `${categoryInfo.color}.dark`,
                              width: 56,
                              height: 56,
                            }}
                          >
                            {categoryInfo.icon}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                              <Chip
                                label={categoryInfo.label}
                                color={categoryInfo.color}
                                size="small"
                                sx={{ fontWeight: "bold" }}
                              />
                              {!notification.read && (
                                <Chip label="MỚI" color="error" size="small" />
                              )}
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography
                                variant="body1"
                                sx={{
                                  fontWeight: notification.read ? "normal" : "bold",
                                  fontSize: "1.1rem",
                                  mb: 1,
                                  color: "text.primary",
                                  whiteSpace: "normal",
                                  wordBreak: "break-word",
                                }}
                              >
                                {notification.message}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {formatTimestamp(new Date(notification.timestamp))}
                                {" • "}
                                {new Date(notification.timestamp).toLocaleString("vi-VN")}
                              </Typography>
                            </Box>
                          }
                        />
                      </ListItemButton>
                    </ListItem>
                    {index < filteredNotifications.length - 1 && <Divider />}
                  </React.Fragment>
                );
              })}
            </List>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={handlePageChange}
                color="primary"
                size="large"
              />
            </Box>
          )}
        </>
      )}
    </Box>
  );
};

export default NotificationPage;
