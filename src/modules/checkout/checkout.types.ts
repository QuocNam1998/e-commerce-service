import type { OrderRecord } from "../orders/orders.types.js";

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

export type PaymentRecord = {
  id: string;
  orderId: string;
  status: PaymentStatus;
  amount: number;
  provider: string;
  providerRefId: string | null;
  clientSecret?: string;
  createdAt: string;
};

export type CheckoutResult = {
  order: OrderRecord;
  payment: PaymentRecord;
};

export type ShippingAddressInput = {
  name: string;
  address: string;
  city: string;
  postal: string;
  country: string;
};

export type InitiateCheckoutInput = {
  userId: string;
  savedAddressId?: string;
  shippingAddress?: ShippingAddressInput;
};

export type ConfirmPaymentInput = {
  orderId: string;
  userId: string;
};
