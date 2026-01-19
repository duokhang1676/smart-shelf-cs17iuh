import { Product, User, Receipt, ReceiptItem } from "../types/receiptTypes";

// Sample products
export const sampleProducts: Product[] = [
  {
    id: "1",
    name: "Wireless Headphones",
    image: "/placeholder.svg?height=80&width=80",
    category: "Electronics",
    price: 99.99,
    sku: "ELEC-001",
  },
  {
    id: "2",
    name: "Coffee Mug",
    image: "/placeholder.svg?height=80&width=80",
    category: "Kitchen",
    price: 15.99,
    sku: "KTCH-001",
  },
  {
    id: "3",
    name: "Notebook",
    image: "/placeholder.svg?height=80&width=80",
    category: "Stationery",
    price: 8.99,
    sku: "STAT-001",
  },
  {
    id: "4",
    name: "Plant Pot",
    image: "/placeholder.svg?height=80&width=80",
    category: "Garden",
    price: 24.99,
    sku: "GRDN-001",
  },
  {
    id: "5",
    name: "Desk Lamp",
    image: "/placeholder.svg?height=80&width=80",
    category: "Furniture",
    price: 45.99,
    sku: "FURN-001",
  },
  {
    id: "6",
    name: "Water Bottle",
    image: "/placeholder.svg?height=80&width=80",
    category: "Sports",
    price: 19.99,
    sku: "SPRT-001",
  },
  {
    id: "7",
    name: "Book",
    image: "/placeholder.svg?height=80&width=80",
    category: "Education",
    price: 12.99,
    sku: "EDUC-001",
  },
  {
    id: "8",
    name: "Phone Case",
    image: "/placeholder.svg?height=80&width=80",
    category: "Electronics",
    price: 29.99,
    sku: "ELEC-002",
  },
];

// Sample users (staff)
export const sampleUsers: User[] = [
  {
    id: "1",
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@company.com",
    role: "Admin",
  },
  {
    id: "2",
    firstName: "Jane",
    lastName: "Smith",
    email: "jane.smith@company.com",
    role: "Manager",
  },
  {
    id: "3",
    firstName: "Mike",
    lastName: "Johnson",
    email: "mike.johnson@company.com",
    role: "Employee",
  },
  {
    id: "4",
    firstName: "Sarah",
    lastName: "Wilson",
    email: "sarah.wilson@company.com",
    role: "Employee",
  },
  {
    id: "5",
    firstName: "David",
    lastName: "Brown",
    email: "david.brown@company.com",
    role: "Viewer",
  },
];

// Sample customers
export const sampleCustomers: User[] = [
  {
    id: "c1",
    firstName: "Alice",
    lastName: "Johnson",
    email: "alice@example.com",
    role: "Customer",
  },
  {
    id: "c2",
    firstName: "Bob",
    lastName: "Smith",
    email: "bob@example.com",
    role: "Customer",
  },
  {
    id: "c3",
    firstName: "Charlie",
    lastName: "Davis",
    email: "charlie@example.com",
    role: "Customer",
  },
  {
    id: "c4",
    firstName: "Diana",
    lastName: "Miller",
    email: "diana@example.com",
    role: "Customer",
  },
  {
    id: "c5",
    firstName: "Edward",
    lastName: "Wilson",
    email: "edward@example.com",
    role: "Customer",
  },
];

// Generate sample receipts
export const generateSampleReceipts = (): Receipt[] => {
  const receipts: Receipt[] = [];

  for (let i = 1; i <= 20; i++) {
    const items: ReceiptItem[] = [];
    const numItems = Math.floor(Math.random() * 4) + 1; // 1-4 items

    let subtotal = 0;
    for (let j = 0; j < numItems; j++) {
      const product =
        sampleProducts[Math.floor(Math.random() * sampleProducts.length)];
      const quantity = Math.floor(Math.random() * 3) + 1; // 1-3 quantity
      const price = product.price;
      const item: ReceiptItem = {
        id: `item-${i}-${j}`,
        product,
        quantity,
        price,
      };
      items.push(item);
      subtotal += price * quantity;
    }

    const tax = subtotal * 0.08; // 8% tax
    const total = subtotal + tax;

    const statuses: Receipt["status"][] = [
      "Paid",
      "Pending",
      "Cancelled",
      "Refunded",
    ];
    const paymentMethods: Receipt["paymentMethod"][] = [
      "Cash",
      "Credit Card",
      "Debit Card",
      "Bank Transfer",
      "Other",
    ];

    const receipt: Receipt = {
      id: `r${i}`,
      receiptNumber: `REC-${2024}-${1000 + i}`,
      customer:
        i % 3 === 0
          ? null
          : sampleCustomers[Math.floor(Math.random() * sampleCustomers.length)],
      items,
      subtotal,
      tax,
      total,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      paymentMethod:
        paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
      notes: i % 5 === 0 ? "Customer requested express delivery" : undefined,
      createdAt: new Date(
        2024,
        Math.floor(Math.random() * 6),
        Math.floor(Math.random() * 28) + 1
      ),
      createdBy: sampleUsers[Math.floor(Math.random() * sampleUsers.length)],
    };

    receipts.push(receipt);
  }

  return receipts;
};
