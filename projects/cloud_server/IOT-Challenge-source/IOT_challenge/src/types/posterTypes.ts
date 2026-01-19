export type Id = string;

export interface Poster {
  _id: Id;
  image_url: string;
  createdAt?: string;
  updatedAt?: string;
  [k: string]: any;
}

export interface PosterPayload {
  image_url: string;
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
  message?: string;
}