// ====== GIỮ NGUYÊN DẠNG MONGOOSE TRẢ VỀ ======

export interface MongooseActivePaths {
  paths: Record<string, string>;
  states: {
    require: Record<string, unknown>;
    default: Record<string, unknown>;
    init: Record<string, boolean>;
  };
}

export interface MongooseDollarMeta {
  activePaths?: MongooseActivePaths;
  skipId?: boolean;
  // Cho phép các key linh hoạt khác của Mongoose
  [k: string]: unknown;
}

export interface OrderDoc {
  _id: string;
  order_code: string;
  shelf_id: string;
  total_bill: number;
  status: string; // "pending" | "processing" | "completed" | "cancelled" | ...
  total: number;
  customer_image?: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  __v: number;
}

export interface Product {
  _id: string;
  product_id?: string;
  product_name?: string;
  price?: number;
  img_url?: string;
  stock?: number;
  weight?: number;
  max_quantity?: number;
  discount?: number;
  user_id?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Order {
  _id: string;
  order_code: string;
  shelf_id?: string;
  total_bill: number;
  status: string;
  createdAt: string;
  updatedAt?: string;
  customer_image?: string;
}

export interface OrderDetail {
  _id: string;
  order_id: Order | string;
  product_id: Product | string;
  quantity: number;
  price: number;
  total_price: number;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * UI types used by ReceiptTable component
 */
export interface ReceiptItem {
  product: Product;
  quantity: number;
  price: number;
  totalPrice: number;
}

export interface ReceiptCustomer {
  firstName?: string;
  lastName?: string;
  image?: string; // path to customer image if available
}

export interface Receipt {
  id: string; // maps to order._id
  receiptNumber: string; // maps to order.order_code
  createdAt: Date;
  customer?: ReceiptCustomer | null;
  items: ReceiptItem[];
  total: number;
  status: string;
  paymentMethod?: string | null;
}

// Helper: map API response (order + details) to Receipt for UI
export function mapApiOrderToReceipt(order: Order, details: OrderDetail[]): Receipt {
  const items: ReceiptItem[] = (details || []).map((d) => ({
    product: typeof d.product_id === "string" ? ({} as Product) : (d.product_id as Product),
    quantity: Number(d.quantity || 0),
    price: Number(d.price || 0),
    totalPrice: Number(d.total_price || (Number(d.quantity || 0) * Number(d.price || 0))),
  }));

  const customer: ReceiptCustomer | null = order.customer_image
    ? { image: order.customer_image }
    : null;

  return {
    id: order._id,
    receiptNumber: order.order_code,
    createdAt: new Date(order.createdAt),
    customer,
    items,
    total: Number(order.total_bill || 0),
    status: order.status,
    paymentMethod: null,
  };
}

export interface FetchAllOrdersResponse {
  success: boolean;
  data: Array<{
    order: Order | any;
  }>;
}

export interface FetchAllOrderItem {
  // Mongoose trả về order document trong _doc theo structure bạn đang dùng
  _doc: OrderDoc;
  // mảng chi tiết hóa đơn (có thể chứa product_id populated object)
  details: OrderDetail[];
  // cho phép các trường khác nếu API có thêm metadata
  [k: string]: any;
}
