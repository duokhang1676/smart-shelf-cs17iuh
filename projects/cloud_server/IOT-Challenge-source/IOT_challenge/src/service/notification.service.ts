import axios from "axios";

const API_URL = import.meta.env.VITE_API_ENDPOINT;

// Notification interface based on the component usage
export interface Notification {
  _id: string;
  message: string;
  type: "warning" | "info" | "error" | "success";
  read: boolean;
  shelf_id?: string | null;
  load_cell_id?: string | null;
  product_id?: string | null;
  user_id?: string | null;
  timestamp: string; // ISO string
  createdAt?: string;
  updatedAt?: string;
  __v?: number;
}

// Create notification request interface
export interface CreateNotificationRequest {
  message: string;
  type: "warning" | "info" | "error" | "success";
  userId?: string;
  shelfId?: string;
  productId?: string;
}

// Get notifications response with pagination
export interface NotificationsResponse {
  notifications: Notification[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// 1. Define the API response type:
interface GetNotificationsAPIResponse {
  success: boolean;
  data: Notification[];
  pagination: {
    currentPage: string;
    totalPages: number;
    totalItems: number;
    itemsPerPage: string;
  };
}

// Get notifications with pagination and filtering
export const getAllNotifications = async (
  page: number = 1,
  limit: number = 10,
  read?: boolean,
  type?: string
): Promise<NotificationsResponse> => {
  try {
    const params = new URLSearchParams();
    params.append("page", page.toString());
    params.append("limit", limit.toString());
    if (read !== undefined) params.append("read", read.toString());
    if (type) params.append("type", type);

    const response = await axios.get<GetNotificationsAPIResponse>(
      `${API_URL}/notifications?${params.toString()}`
    );
    console.log(response);

    return {
      notifications: response.data.data,
      total: response.data.pagination.totalItems,
      page: Number(response.data.pagination.currentPage),
      limit: Number(response.data.pagination.itemsPerPage),
      totalPages: response.data.pagination.totalPages,
    };
  } catch (error) {
    console.error("Error fetching notifications:", error);
    throw new Error("Failed to fetch notifications");
  }
};

// Get notification by ID
export const getNotificationById = async (
  id: string
): Promise<Notification> => {
  try {
    const response = await axios.get<Notification>(
      `${API_URL}/notifications/${id}`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching notification by id:", error);
    throw new Error("Failed to fetch notification");
  }
};

// Create a new notification
export const createNotification = async (
  notificationData: CreateNotificationRequest
): Promise<Notification> => {
  try {
    const response = await axios.post<Notification>(
      `${API_URL}/notifications`,
      notificationData
    );
    return response.data;
  } catch (error) {
    console.error("Error creating notification:", error);
    throw new Error("Failed to create notification");
  }
};

// Mark notification as read
export const markAsRead = async (id: string): Promise<Notification> => {
  try {
    const response = await axios.patch<Notification>(
      `${API_URL}/notifications/${id}/read`
    );
    return response.data;
  } catch (error) {
    console.error("Error marking notification as read:", error);
    throw new Error("Failed to mark notification as read");
  }
};

// Mark all notifications as read
export const markAllAsRead = async (): Promise<{ message: string }> => {
  try {
    const response = await axios.patch<{ message: string }>(
      `${API_URL}/notifications/mark-all-read`
    );
    return response.data;
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    throw new Error("Failed to mark all notifications as read");
  }
};

// Delete notification
export const deleteNotification = async (
  id: string
): Promise<{ message: string }> => {
  try {
    const response = await axios.delete<{ message: string }>(
      `${API_URL}/notifications/${id}`
    );
    return response.data;
  } catch (error) {
    console.error("Error deleting notification:", error);
    throw new Error("Failed to delete notification");
  }
};

// Get unread notifications count
export const getUnreadCount = async (): Promise<{
  data: { unreadCount: number };
}> => {
  try {
    const response = await axios.get<{ data: { unreadCount: number } }>(
      `${API_URL}/notifications/unread-count`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching unread count:", error);
    throw new Error("Failed to fetch unread count");
  }
};

// Utility function to format timestamp
export const formatTimestamp = (timestamp: Date): string => {
  const now = new Date();
  const diff = now.getTime() - timestamp.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

// Utility function to get notification icon based on type
export const getNotificationIcon = (type: Notification["type"]) => {
  switch (type) {
    case "warning":
      return "warning";
    case "error":
      return "error";
    case "success":
      return "success";
    case "info":
    default:
      return "info";
  }
};
