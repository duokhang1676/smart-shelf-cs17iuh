import { User } from "./userTypes";

export interface Product {
  _id?: string;
  product_id: string;
  product_name: string;
  img_url: string;
  price: number;
  stock: number;
  weight: number;
  discount: number;
  max_quantity: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Shelf {
  _id: string;
  shelf_id: string;
  mac_ip: string;
  shelf_name: string;
  user_id?: User | null;
  location: string;
  createdAt: Date;
}

export interface ShelfCreationData {
  shelf_id: string;
  shelf_name: string;
  location: string;
  user_id: string;
}

export interface LoadCell {
  _id: string;
  load_cell_id: string;
  load_cell_name: string;
  product_id: string | null;
  previous_product_id: string | null;
  product_name: string;
  shelf_id: string;
  quantity: number;
  floor: number; // Thêm nếu load cell có vị trí tầng
  column: number;
  threshold: number;
  error?: number;
}

export interface LoadCellResponse {
  shelf: {
    shelf_id: string;
    _id: string;
  };
  loadCells: LoadCell[];
  message: string;
}
