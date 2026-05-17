export type OrderStatus =
  | "pending_payment"
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

export type FrontendOrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

export type AdminOrderStatus = "confirmed" | "shipped" | "delivered";

const VALID_TRANSITIONS: Record<string, AdminOrderStatus> = {
  pending: "confirmed",
  confirmed: "shipped",
  shipped: "delivered",
};

export function getNextOrderStatus(current: OrderStatus): AdminOrderStatus | null {
  return VALID_TRANSITIONS[current] ?? null;
}

export function isValidTransition(current: OrderStatus, next: AdminOrderStatus): boolean {
  return VALID_TRANSITIONS[current] === next;
}

export type OrderItemRecord = {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
};

export type OrderRecord = {
  id: string;
  userId: string;
  status: OrderStatus;
  total: number;
  shipName: string;
  shipAddress: string;
  shipCity: string;
  shipPostal: string;
  shipCountry: string;
  items: OrderItemRecord[];
  createdAt: string;
};

export type FrontendOrderItemResponse = {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
};

export type FrontendShippingAddressResponse = {
  line1: string;
  line2: string | null;
  city: string;
  postalCode: string;
  country: string;
};

export type FrontendOrderDetailResponse = {
  id: string;
  status: FrontendOrderStatus;
  total: number;
  currency: string;
  createdAt: string;
  estimatedDelivery: string;
  items: FrontendOrderItemResponse[];
  shippingAddress: FrontendShippingAddressResponse;
};

export type FrontendOrderSummaryResponse = {
  id: string;
  status: FrontendOrderStatus;
  total: number;
  currency: string;
  createdAt: string;
  estimatedDelivery: string;
};

export type CreateOrderInput = {
  userId: string;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
  shippingAddress: {
    name: string;
    address: string;
    city: string;
    postal: string;
    country: string;
  };
};

export type CreateOrderData = {
  userId: string;
  total: number;
  items: Array<{
    productId: string;
    name: string;
    price: number;
    quantity: number;
  }>;
  shippingAddress: {
    name: string;
    address: string;
    city: string;
    postal: string;
    country: string;
  };
};
