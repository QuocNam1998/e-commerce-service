export type PaymentResult = {
  providerRefId: string;
  status: "pending" | "paid" | "failed" | "refunded";
  clientSecret?: string;
};

export type CreatePaymentParams = {
  amount: number;
  orderId: string;
  currency?: string;
};

export interface PaymentProvider {
  name: string;
  createPayment(params: CreatePaymentParams): Promise<PaymentResult>;
  confirmPayment(providerRefId: string): Promise<PaymentResult>;
  refundPayment(providerRefId: string): Promise<PaymentResult>;
}
