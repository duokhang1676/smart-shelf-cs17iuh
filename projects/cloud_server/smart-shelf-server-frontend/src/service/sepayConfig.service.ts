import axios from "axios";

const API_URL = import.meta.env.VITE_API_ENDPOINT || "/api";

export interface SepayConfig {
  _id?: string;
  vietqrAccountNo: string;
  vietqrAccountName: string;
  vietqrAcqId: string;
  sepayAuthToken: string;
  sepayBankAccountId: string;
  createdAt?: string;
  updatedAt?: string;
}

export async function getSepayConfig(shelfId: string, signal?: AbortSignal): Promise<SepayConfig | null> {
  try {
    const { data } = await axios.get<SepayConfig>(`${API_URL}/sepay-config/shelf/${shelfId}`, { signal });
    return data;
  } catch (err: any) {
    if (axios.isAxiosError(err) && err.response?.status === 404) return null;
    throw err;
  }
}

export async function upsertSepayConfig(shelfId: string, payload: Partial<SepayConfig>): Promise<SepayConfig> {
  const { data } = await axios.post<SepayConfig>(`${API_URL}/sepay-config/shelf/${shelfId}`, payload);
  return data;
}
