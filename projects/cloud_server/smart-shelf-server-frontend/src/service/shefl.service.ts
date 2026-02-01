import axios from "axios";
import { Product, Shelf, ShelfCreationData,LoadCellResponse, LoadCell } from "../types/selfTypes";
const API_URL = import.meta.env.VITE_API_ENDPOINT;
const IMG_PREFIX = import.meta.env.VITE_PREFIX_IMAGE;

export const fetchProducts = async (): Promise<Product[]> => {
  try {
    const response = await axios.get<Product[]>(`${API_URL}/products`);
    // Gắn prefix cho img_url
    const productsWithPrefix = response.data.map((product) => ({
      ...product,
      img_url: product.img_url.startsWith("http")
        ? product.img_url
        : IMG_PREFIX + product.img_url,
    }));
    return productsWithPrefix;
  } catch (error) {
    console.error("Error fetching products:", error);
    return [];
  }
};

export const fetchShelves = async (): Promise<Shelf[]> => {
  const response = await axios.get(`${API_URL}/shelves`);
  
  return response.data;
};

export const fetchShelfById = async (shelfId: string): Promise<Shelf[]> => {
  const response = await axios.get(`${API_URL}/shelves/${shelfId}`);
  return response.data;
};

export const createShelf = async (
  shelfData: ShelfCreationData
): Promise<Shelf> => {
  const response = await axios.post(`${API_URL}/shelves`, shelfData);

  console.log(response);
  
  return response.data;
};

export const updateShelf = async (
  shelfId: string,
  shelfData: Partial<Shelf>
): Promise<Shelf> => {
  const response = await axios.put(`${API_URL}/shelves/${shelfId}`, shelfData);
  return response.data;
};

export const fetchLoadCellsByShelfId = async (shelfId: string): Promise<LoadCellResponse> => {
  try {
    const response = await axios.get(`${API_URL}/shelves/get-loadcell/${shelfId}`);
    console.log(response);
    
    return response.data;
  } catch (error) {
    console.error(`Error fetching load cells for shelf ${shelfId}:`, error);
    throw error;
  }
};

// new: delete shelf
export const deleteShelf = async (shelfId: string): Promise<boolean> => {
  try {
    const response = await axios.delete(`${API_URL}/shelves/${shelfId}`);
    console.log("deleteShelf response:", response);
    return response.status >= 200 && response.status < 300;
  } catch (error) {
    console.error(`Error deleting shelf ${shelfId}:`, error);
    return false;
  }
};