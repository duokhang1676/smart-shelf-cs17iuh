// src/service/statistics.service.ts
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_ENDPOINT || "/api",
  withCredentials: false,
});

// Doanh thu: /api/orders/statistics/revenue
export async function getRevenueStatistics(params?: {
  period?: "daily" | "weekly" | "monthly" | "yearly" | "all";
  year?: number;
  month?: number;
  startDate?: string; // ISO
  endDate?: string;   // ISO
}) {
  const res = await api.get("/orders/statistics/revenue", { params });
  // Trả raw để DashboardPage tự normalize (đã code sẵn)
  return res.data;
}

// Top sản phẩm + summary: /api/orders/statistics/products
export async function getTopProducts(options?: { limit?: number; period?: string }) {
  const { limit = 10, period = "all" } = options || {};
  const res = await api.get("/orders/statistics/products", { params: { limit, period } });
  return res.data;
}

// Lấy summary sản phẩm (đếm uniqueProductCount...) – dùng chung endpoint products
export async function getProductStats(options?: { limit?: number; period?: string }) {
  const { limit = 0, period = "all" } = options || {};
  const res = await api.get("/orders/statistics/products", { params: { limit, period } });
  return res.data;
}
