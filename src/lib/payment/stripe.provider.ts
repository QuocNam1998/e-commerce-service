import Stripe from "stripe";
import { env } from "../../config/env.js";
import type { CreatePaymentParams, PaymentProvider, PaymentResult } from "./payment.provider.js";

export class StripePaymentProvider implements PaymentProvider {
  readonly name = "stripe";
  private stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(env.STRIPE_SECRET_KEY!);
  }

  async createPayment(params: CreatePaymentParams): Promise<PaymentResult> {
    const intent = await this.stripe.paymentIntents.create({
      amount: params.amount,
      currency: params.currency ?? "usd",
      metadata: { orderId: params.orderId },
    });

    return {
      providerRefId: intent.id,
      status: "pending",
      clientSecret: intent.client_secret ?? undefined,
    };
  }

  async confirmPayment(providerRefId: string): Promise<PaymentResult> {
    const intent = await this.stripe.paymentIntents.retrieve(providerRefId);

    let status: PaymentResult["status"];
    if (intent.status === "succeeded") {
      status = "paid";
    } else if (intent.status === "canceled") {
      status = "failed";
    } else {
      status = "pending";
    }

    return { providerRefId: intent.id, status };
  }

  async refundPayment(providerRefId: string): Promise<PaymentResult> {
    await this.stripe.refunds.create({ payment_intent: providerRefId });
    return { providerRefId, status: "refunded" };
  }
}
