import axios from "axios";
import { LoginResponse } from "../types/userTypes";
const API_URL = import.meta.env.VITE_API_ENDPOINT;

export const login = async (username: string, password: string): Promise<LoginResponse> => {
  console.log(`${API_URL}/users/login`);
  
  const response = await axios.post(`${API_URL}/users/login`, { username, password });
  return response.data;
};

export const logout = async (username: string, password: string): Promise<LoginResponse> => {
  console.log(`${API_URL}/users/login`);
  
  const response = await axios.post(`${API_URL}/users/login`, { username, password });
  return response.data;
};

