import axios from "axios";
import { Combo } from "../types/combo.type";
const API_URL = import.meta.env.VITE_API_ENDPOINT;
const IMG_PREFIX = import.meta.env.VITE_PREFIX_IMAGE;

function mapComboImage(c: any): Combo {
  const image = c.image ?? c.img ?? "";
  return {
    ...c,
    image: image && !image.startsWith("http") ? (IMG_PREFIX || "") + "/"  + image : image,
    // ensure numeric fields exist
    price: Number(c.price ?? c.price ?? 0),
    oldPrice: c.oldPrice !== undefined ? Number(c.oldPrice) : undefined,
  } as Combo;
}


export async function fetchCombos(params?: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<{ data: Combo[]; meta?: any } | null> {
  try {
    const res = await axios.get(`${API_URL}/combos`, { params });
    const payload = Array.isArray(res.data) ? { data: res.data } : res.data;
    const combos = (payload.data || []).map(mapComboImage);
    console.log(combos);
    
    return { data: combos, meta: payload.meta };
  } catch (error) {
    console.error("fetchCombos error", error);
    return null;
  }
}

export async function getComboById(id: string): Promise<Combo | null> {
  try {
    const res = await axios.get(`${API_URL}/combos/${id}`);
    const payload = res.data?.data ?? res.data;
    return payload ? mapComboImage(payload) : null;
  } catch (error) {
    console.error("getComboById error", error);
    return null;
  }
}

// replace/create createCombo to accept FormData or plain object
export async function createCombo(payload: FormData | Record<string, any>) {
  try {
    // If payload is FormData, let axios/browser set Content-Type (multipart/form-data with boundary)
    const res = await axios.post(`${API_URL}/combos`, payload);
    return res.data;
  } catch (err: any) {
    console.error("createCombo error", err);
    throw err;
  }
}

// optionally update updateCombo if used with FormData
export async function updateCombo(id: string, payload: FormData | Record<string, any>) {
  try {
    const res = await axios.put(`${API_URL}/combos/${id}`, payload);
    return res.data;
  } catch (err: any) {
    console.error("updateCombo error", err);
    throw err;
  }
}

export async function deleteCombo(id: string): Promise<boolean> {
  try {
    await axios.delete(`${API_URL}/combos/${id}`);
    return true;
  } catch (error) {
    console.error("deleteCombo error", error);
    return false;
  }
}

export default {
  fetchCombos,
  getComboById,
  createCombo,
  updateCombo,
  deleteCombo,
};