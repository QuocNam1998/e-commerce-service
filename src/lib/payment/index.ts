export type { PaymentProvider, PaymentResult, CreatePaymentParams } from "./payment.provider.js";
export { MockPaymentProvider } from "./mock.provider.js";
export { StripePaymentProvider } from "./stripe.provider.js";

import { env } from "../../config/env.js";
import { MockPaymentProvider } from "./mock.provider.js";
import { StripePaymentProvider } from "./stripe.provider.js";

export const paymentProvider = env.STRIPE_SECRET_KEY
  ? new StripePaymentProvider()
  : new MockPaymentProvider();
