import axios from "axios";
import { Product } from "../types/selfTypes";
const API_URL = import.meta.env.VITE_API_ENDPOINT;
const IMG_PREFIX = import.meta.env.VITE_PREFIX_IMAGE;

export const fetchProducts = async (): Promise<Product[]> => {
  try {
    const response = await axios.get<Product[]>(`${API_URL}/products`);
    const productsWithPrefix = response.data.map((product) => ({
      ...product,
      img_url:
        product.img_url && product.img_url.startsWith("http")
          ? product.img_url
          : product.img_url
            ? `${IMG_PREFIX}${product.img_url}`
            : "",
    }));
    return productsWithPrefix;
  } catch (error) {
    console.error("Error fetching products:", error);
    return [];
  }
};

export async function getProductById(productId: string): Promise<Product | null> {
  try {
    const response = await axios.get<Product>(`${API_URL}/products/${productId}`);
    const product = response.data;
    return {
      ...product,
      img_url:
        product.img_url && product.img_url.startsWith("http")
          ? product.img_url
          : product.img_url
            ? `${IMG_PREFIX}${product.img_url}`
            : "",
    };
  } catch (error) {
    console.error("Error fetching product by id:", error);
    return null;
  }
}

export async function addProduct(productData: Product, file?: File) {
  const form = new FormData();
  form.append("product_id", productData.product_id ?? "");
  form.append("product_name", productData.product_name ?? "");
  form.append("stock", String(productData.stock ?? 0));
  form.append("price", String(productData.price ?? 0));
  form.append("discount", String(productData.discount ?? 0));
  form.append("weight", String(productData.weight ?? 0));
  form.append("max_quantity", String(productData.max_quantity ?? 0));
  if (file) {
    // only send under allowed field names ("image" and/or "img_url")
    form.append("image", file);
    form.append("img_url", file);
  }

  try {
    const response = await axios.post(`${API_URL}/products`, form);
    const product = response.data;

    return {
      ...product,
      img_url:
        product.img_url && product.img_url.startsWith("http")
          ? product.img_url
          : product.img_url
            ? `${IMG_PREFIX}${product.img_url}`
            : "",
    };
  } catch (error: any) {
    throw new Error(error.response?.data?.error || "Failed to add product");
  }
}

export async function updateProduct(
  productId: string | undefined,
  productData: any,
  file?: File
) {
  const form = new FormData();

  form.append("product_name", productData.product_name ?? "");
  form.append("price", String(productData.price ?? 0));
  form.append("stock", String(productData.stock ?? 0));
  form.append("discount", String(productData.discount ?? 0));
  form.append("weight", String(productData.weight ?? 0));
  form.append("max_quantity", String(productData.max_quantity ?? 0));
  if (file) {
    form.append("image", file);
    form.append("img_url", file);
  }

  const response = await axios.put(`${API_URL}/products/${productId}`, form);
  const product = response.data;

  return {
    ...product,
    img_url:
      product.img_url && product.img_url.startsWith("http")
        ? product.img_url
        : product.img_url
          ? `${IMG_PREFIX}${product.img_url}`
          : "",
  };
}

export async function deleteProduct(productId: string) {
  try {
    const response = await axios.delete(`${API_URL}/products/${productId}`);
    return response.data;
  } catch (error) {
    console.error("Error deleting product:", error);
    throw new Error("Failed to delete product");
  }
}
