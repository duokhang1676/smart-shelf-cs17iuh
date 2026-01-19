export interface Product {
  id: string;
  name: string;
  image: string;
  category: string;
  price: number;
  description?: string;
  stock?: number;
  sku?: string;
  createdAt: Date;
}

export const categories = [
  "Electronics",
  "Kitchen",
  "Stationery",
  "Garden",
  "Furniture",
  "Sports",
  "Education",
  "Clothing",
  "Toys",
  "Food",
];

export const initialProducts: Product[] = [
  {
    id: "1",
    name: "Wireless Headphones",
    image: "/placeholder.svg?height=200&width=200",
    category: "Electronics",
    price: 99.99,
    description: "High-quality wireless headphones with noise cancellation",
    stock: 15,
    sku: "ELEC-001",
    createdAt: new Date(2023, 5, 15),
  },
  // ... các sản phẩm còn lại ...
];
