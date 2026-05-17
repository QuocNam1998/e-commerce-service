import type { CreatePaymentParams, PaymentProvider, PaymentResult } from "./payment.provider.js";

export class MockPaymentProvider implements PaymentProvider {
  readonly name = "mock";

  async createPayment(params: CreatePaymentParams): Promise<PaymentResult> {
    return {
      providerRefId: `mock_${params.orderId}_${Date.now()}`,
      status: "pending",
    };
  }

  async confirmPayment(providerRefId: string): Promise<PaymentResult> {
    return {
      providerRefId,
      status: "paid",
    };
  }

  async refundPayment(providerRefId: string): Promise<PaymentResult> {
    return {
      providerRefId,
      status: "refunded",
    };
  }
}
