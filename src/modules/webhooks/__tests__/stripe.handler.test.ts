import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../config/env.js", () => ({
  env: {
    STRIPE_SECRET_KEY: "sk_test_123",
    STRIPE_WEBHOOK_SECRET: "whsec_test",
  },
}));

vi.mock("stripe");

vi.mock("../../checkout/checkout.repository.js", () => ({
  findPaymentByStripeEventId: vi.fn(),
  findPaymentByOrderId: vi.fn(),
  markPaymentPaid: vi.fn(),
  markPaymentFailed: vi.fn(),
  updateOrderStatus: vi.fn(),
}));

vi.mock("../../orders/orders.repository.js", () => ({
  findOrderById: vi.fn(),
}));

vi.mock("../../cart/cart.repository.js", () => ({
  clearCart: vi.fn(),
}));

vi.mock("../../products/products.repository.js", () => ({
  incrementProductStocks: vi.fn(),
}));

vi.mock("../../auth/auth.repository.js", () => ({
  findUserById: vi.fn(),
}));

vi.mock("../../../lib/mail.js", () => ({
  isMailConfigured: vi.fn().mockReturnValue(false),
  sendMail: vi.fn(),
}));

vi.mock("../../../lib/logger.js", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import Stripe from "stripe";
import {
  findPaymentByStripeEventId,
  findPaymentByOrderId,
  markPaymentPaid,
  markPaymentFailed,
  updateOrderStatus,
} from "../../checkout/checkout.repository.js";
import { findOrderById } from "../../orders/orders.repository.js";
import { clearCart } from "../../cart/cart.repository.js";
import { incrementProductStocks } from "../../products/products.repository.js";
import { handleStripeWebhook } from "../stripe.handler.js";

const MOCK_ORDER = {
  id: "order-1",
  userId: "user-1",
  status: "pending_payment",
  total: 2000,
  shipName: "John",
  shipAddress: "1 St",
  shipCity: "City",
  shipPostal: "12345",
  shipCountry: "US",
  items: [{ id: "item-1", productId: "prod-1", name: "Widget", price: 1000, quantity: 2 }],
  createdAt: "2024-01-01T00:00:00.000Z",
};

const MOCK_PAYMENT = {
  id: "payment-1",
  orderId: "order-1",
  status: "pending" as const,
  amount: 2000,
  provider: "stripe",
  providerRefId: "pi_123",
  createdAt: "2024-01-01T00:00:00.000Z",
};

function makeReq(event: object): Request {
  return {
    headers: { "stripe-signature": "valid-sig" },
    body: Buffer.from(JSON.stringify(event)),
  } as unknown as Request;
}

function makeRes(): Response {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return res as unknown as Response;
}

function mockStripeWith(event: Stripe.Event) {
  vi.mocked(Stripe).mockImplementation(
    () => ({ webhooks: { constructEvent: vi.fn().mockReturnValue(event) } } as any)
  );
}

function makeEvent(type: string, intent: Partial<Stripe.PaymentIntent>): Stripe.Event {
  return {
    id: "evt_test_123",
    type,
    data: { object: intent },
  } as unknown as Stripe.Event;
}

describe("handleStripeWebhook — payment_intent.succeeded", () => {
  const intent: Partial<Stripe.PaymentIntent> = { id: "pi_123", metadata: { orderId: "order-1" } };

  beforeEach(() => {
    vi.clearAllMocks();
    mockStripeWith(makeEvent("payment_intent.succeeded", intent));
    vi.mocked(findPaymentByStripeEventId).mockResolvedValue(null);
    vi.mocked(findOrderById).mockResolvedValue(MOCK_ORDER as any);
    vi.mocked(findPaymentByOrderId).mockResolvedValue(MOCK_PAYMENT);
    vi.mocked(markPaymentPaid).mockResolvedValue({ ...MOCK_PAYMENT, status: "paid" });
    vi.mocked(updateOrderStatus).mockResolvedValue();
    vi.mocked(clearCart).mockResolvedValue();
  });

  it("marks payment paid and confirms order for a valid event", async () => {
    const res = makeRes();
    await handleStripeWebhook(makeReq({}), res);

    expect(markPaymentPaid).toHaveBeenCalledWith("order-1", "pi_123", "evt_test_123");
    expect(updateOrderStatus).toHaveBeenCalledWith("order-1", "CONFIRMED");
    expect(clearCart).toHaveBeenCalledWith("user-1");
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  it("skips processing when the Stripe event ID was already handled (idempotency)", async () => {
    vi.mocked(findPaymentByStripeEventId).mockResolvedValue({ ...MOCK_PAYMENT, status: "paid" });

    const res = makeRes();
    await handleStripeWebhook(makeReq({}), res);

    expect(markPaymentPaid).not.toHaveBeenCalled();
    expect(updateOrderStatus).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  it("skips processing when order is already confirmed", async () => {
    vi.mocked(findOrderById).mockResolvedValue({ ...MOCK_ORDER, status: "confirmed" } as any);

    const res = makeRes();
    await handleStripeWebhook(makeReq({}), res);

    expect(markPaymentPaid).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  it("returns 400 when Stripe signature verification fails", async () => {
    vi.mocked(Stripe).mockImplementation(
      () => ({
        webhooks: {
          constructEvent: vi.fn().mockImplementation(() => {
            throw new Error("Invalid signature");
          }),
        },
      } as any)
    );

    const res = makeRes();
    await handleStripeWebhook(makeReq({}), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(markPaymentPaid).not.toHaveBeenCalled();
  });
});

describe("handleStripeWebhook — payment_intent.payment_failed", () => {
  const intent: Partial<Stripe.PaymentIntent> = { id: "pi_123", metadata: { orderId: "order-1" } };

  beforeEach(() => {
    vi.clearAllMocks();
    mockStripeWith(makeEvent("payment_intent.payment_failed", intent));
    vi.mocked(findOrderById).mockResolvedValue(MOCK_ORDER as any);
    vi.mocked(markPaymentFailed).mockResolvedValue({ ...MOCK_PAYMENT, status: "failed" });
    vi.mocked(updateOrderStatus).mockResolvedValue();
    vi.mocked(incrementProductStocks).mockResolvedValue();
  });

  it("marks payment failed, cancels order, and restores stock", async () => {
    const res = makeRes();
    await handleStripeWebhook(makeReq({}), res);

    expect(markPaymentFailed).toHaveBeenCalledWith("order-1");
    expect(updateOrderStatus).toHaveBeenCalledWith("order-1", "CANCELLED");
    expect(incrementProductStocks).toHaveBeenCalledWith([
      { productId: "prod-1", quantity: 2 },
    ]);
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  it("skips processing when order is already cancelled", async () => {
    vi.mocked(findOrderById).mockResolvedValue({ ...MOCK_ORDER, status: "cancelled" } as any);

    const res = makeRes();
    await handleStripeWebhook(makeReq({}), res);

    expect(markPaymentFailed).not.toHaveBeenCalled();
    expect(incrementProductStocks).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });
});
