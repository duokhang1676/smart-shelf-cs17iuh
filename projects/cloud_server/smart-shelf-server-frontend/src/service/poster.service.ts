import { Poster, PosterPayload, PaginatedResponse } from "../types/posterTypes";

const API_BASE = import.meta.env.VITE_API_ENDPOINT;
const POSTERS_URL = `${API_BASE}/posters`;

async function handleResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const errMsg = (json && (json.message || json.error)) || res.statusText;
    throw new Error(errMsg);
  }
  return json as T;
}

export async function getPosters(params?: { page?: number; limit?: number }) {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  const res = await fetch(`${POSTERS_URL}?${qs.toString()}`);
  return handleResponse<PaginatedResponse<Poster>>(res);
}

export async function getPoster(id: string) {
  const res = await fetch(`${POSTERS_URL}/${id}`);
  return handleResponse<{ success: boolean; data: Poster }>(res);
}

// Accept either JSON payload or FormData (for file upload)
export async function createPoster(payload: PosterPayload | FormData) {
  const init: RequestInit = {
    method: "POST",
    body: payload instanceof FormData ? payload : JSON.stringify(payload),
    headers: payload instanceof FormData ? {} : { "Content-Type": "application/json" },
  };
  const res = await fetch(POSTERS_URL, init);
  return handleResponse<{ success: boolean; data: Poster }>(res);
}

export async function updatePoster(id: string, payload: Partial<PosterPayload> | FormData) {
  const init: RequestInit = {
    method: "PATCH",
    body: payload instanceof FormData ? payload : JSON.stringify(payload),
    headers: payload instanceof FormData ? {} : { "Content-Type": "application/json" },
  };
  const res = await fetch(`${POSTERS_URL}/${id}`, init);
  return handleResponse<{ success: boolean; data: Poster }>(res);
}

export async function deletePoster(id: string) {
  const res = await fetch(`${POSTERS_URL}/${id}`, { method: "DELETE" });
  return handleResponse<{ success: boolean; message?: string }>(res);
}

export default { getPosters, getPoster, createPoster, updatePoster, deletePoster };