import { fetchProducts } from "../service/shefl.service";
import { Product } from "../types/selfTypes";

export interface ShelfItem {
  product: Product | null;
  position: { level: number; compartment: number };
}

export interface Shelf {
  id: string;
  name: string;
  items: ShelfItem[];
  createdAt: Date;
}

export const createEmptyShelfItems = (): ShelfItem[] => {
  const items: ShelfItem[] = [];
  for (let level = 0; level < 3; level++) {
    for (let compartment = 0; compartment < 5; compartment++) {
      items.push({
        product: null,
        position: { level, compartment },
      });
    }
  }
  return items;
};
