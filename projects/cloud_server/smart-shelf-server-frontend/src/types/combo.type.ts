export type Combo = {
  _id?: string;
  name: string;
  description?: string;
  image?: string;
  price: number;
  oldPrice: number;
  validFrom?: Date;
  validTo?: Date;
  products?: any[]; // populated product objects or ids
  createdAt?: string;
  updatedAt?: string;
};