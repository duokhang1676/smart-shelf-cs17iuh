import { History, HistoryPayload, PaginatedResponse } from "../types/historyTypes";

const API_BASE = import.meta.env.VITE_API_ENDPOINT; // nếu cần prefix (ex: /api) -> "/api"
const HISTORIES_URL = `${API_BASE}/histories`;

async function handleResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const errMsg = (json && (json.message || json.error)) || res.statusText;
    throw new Error(errMsg);
  }
  return json;
}

export async function getHistories(params?: {
  page?: number;
  limit?: number;
  shelfId?: string;
  userId?: string;
  from?: string;
  to?: string;
}): Promise<PaginatedResponse<History>> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.shelfId) qs.set("shelfId", params.shelfId);
  if (params?.userId) qs.set("userId", params.userId);
  if (params?.from) qs.set("from", params.from);
  if (params?.to) qs.set("to", params.to);

  const res = await fetch(`${HISTORIES_URL}?${qs.toString()}`);
  return handleResponse<PaginatedResponse<History>>(res);
}

export async function getHistoryById(id: string): Promise<{ success: boolean; data: History }> {
  const res = await fetch(`${HISTORIES_URL}/${id}`);
  return handleResponse<{ success: boolean; data: History }>(res);
}

export async function createHistory(payload: HistoryPayload): Promise<{ success: boolean; data: History }> {
  const res = await fetch(HISTORIES_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse<{ success: boolean; data: History }>(res);
}

export async function updateHistory(id: string, payload: HistoryPayload): Promise<{ success: boolean; data: History }> {
  const res = await fetch(`${HISTORIES_URL}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse<{ success: boolean; data: History }>(res);
}

export async function deleteHistory(id: string): Promise<{ success: boolean; message?: string }> {
  const res = await fetch(`${HISTORIES_URL}/${id}`, {
    method: "DELETE",
  });
  return handleResponse<{ success: boolean; message?: string }>(res);
}

export default {
  getHistories,
  getHistoryById,
  createHistory,
  updateHistory,
  deleteHistory,
};