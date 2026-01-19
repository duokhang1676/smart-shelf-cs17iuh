export type Id = string;

export interface RefShelf {
  _id: Id;
  shelf_id?: string;
  [k: string]: any;
}

export interface RefUser {
  _id: Id;
  username?: string;
  fullName?: string;
  [k: string]: any;
}

export interface RefProduct {
  _id: Id;
  product_name?: string;
  product_id?: string;
  [k: string]: any;
}

export interface History {
  _id: Id;
  notes?: string;
  shelf?: RefShelf[] | Id[];
  user?: RefUser[] | Id[];
  pre_products?: RefProduct[] | Id[];
  post_products?: RefProduct[] | Id[];
  pre_verified_quantity?: number[];
  post_verified_quantity?: number[];
  createdAt?: string;
  updatedAt?: string;
  [k: string]: any;
}

export interface HistoryPayload {
  notes?: string;
  shelf?: Id | Id[]; // accept single id or array
  user?: Id | Id[];
  pre_products?: Id | Id[];
  post_products?: Id | Id[];
  pre_verified_quantity?: number[] | number;
  post_verified_quantity?: number[] | number;
  [k: string]: any;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    [k: string]: any;
  };
  [k: string]: any;
}