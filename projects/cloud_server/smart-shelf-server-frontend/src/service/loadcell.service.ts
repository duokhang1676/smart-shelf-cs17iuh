import { LoadCell } from "../types/selfTypes";
import axios from "axios";
const API_URL = import.meta.env.VITE_API_ENDPOINT;

export const updateLoadCell = async (
  loadCellId: string,
  data: Partial<LoadCell>
): Promise<LoadCell> => {
  try {
    const response = await axios.put(`${API_URL}/loadcell/${loadCellId}`, data);
    return response.data;
  } catch (error) {
    console.error(`Error updating load cell ${loadCellId}:`, error);
    throw error;
  }
};


export const removeProductFromLoadcell = async (
  loadCellId: string,
  data: Partial<LoadCell>
): Promise<LoadCell> => {
  try {
    const response = await axios.put(`${API_URL}/loadcell/${loadCellId}`, data);
    return response.data;
  } catch (error) {
    console.error(`Error updating load cell ${loadCellId}:`, error);
    throw error;
  }
};


export const updateLoadCellThreshold = async (
  loadCellId: string,
  newThreshold: number
): Promise<LoadCell> => {
  try {
    const response = await axios.patch(
      `${API_URL}/loadcell/${loadCellId}/quantity-threshold`,
      { threshold: newThreshold }
    );

    console.log(response);
    
    return response.data;
  } catch (error) {
    console.error(`Error updating threshold for load cell ${loadCellId}:`, error);
    throw error;
  }
};


export const updateLoadCellQuantity = async (
  loadCellId: string,
  newQuantity: number
): Promise<LoadCell> => {
  try {
    const response = await axios.patch(
      `${API_URL}/loadcell/${loadCellId}/upload-quantity`,
      { quantity: newQuantity }
    );
    return response.data;
  } catch (error) {
    console.error(`Error updating quantity for load cell ${loadCellId}:`, error);
    throw error;
  }
};