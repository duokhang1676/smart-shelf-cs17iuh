import axios from "axios";
import type { FetchAllOrdersResponse } from "../types/receiptTypes";
const API_URL = import.meta.env.VITE_API_ENDPOINT;
const IMG_PREFIX = import.meta.env.VITE_PREFIX_IMAGE;

/** Lấy toàn bộ orders (đúng payload bạn gửi: giữ nguyên _doc, $__ ...) */
export async function fetchAllReceipts(signal?: AbortSignal) {
  const res = await axios.get<FetchAllOrdersResponse>(API_URL + "/orders", { signal });

  // ensure prefix normalized (no trailing slash)
  const prefix = (IMG_PREFIX ?? "").replace(/\/+$/, "");

  const toFullUrl = (p?: string | null) => {
    if (!p) return "";
    const s = String(p);
    if (/^https?:\/\//i.test(s)) return s;
    const path = s.replace(/^\/+/, "");
    return prefix ? `${prefix}/${path}` : `/${path}`;
  };

  const payload = res.data;

  // normalize customer_image and product.img_url inside details
  try {
    if (payload && Array.isArray((payload as any).data)) {
      (payload as any).data = (payload as any).data.map((item: any) => {
        const order = item.order || item._doc || {};
        if (order.customer_image) order.customer_image = toFullUrl(order.customer_image);

        if (Array.isArray(item.details)) {
          item.details = item.details.map((d: any) => {
            if (d && d.product_id && typeof d.product_id === "object") {
              d.product_id.img_url = toFullUrl(d.product_id.img_url);
            }
            return d;
          });
        }
        return item;
      });
    }
  } catch (e) {
    // fail-safe: if normalization errors, return original payload
    console.error("Receipt image normalization error:", e);
  }

  return payload; // { success, data: [...] }
}
