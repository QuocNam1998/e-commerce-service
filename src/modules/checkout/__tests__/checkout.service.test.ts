import { beforeEach, describe, expect, it, vi } from "vitest";
import { HttpError } from "../../../lib/httpError.js";

vi.mock("../../../lib/db/prisma.js", () => ({
  prisma: {
    order: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("../../../lib/payment/index.js", () => ({
  paymentProvider: {
    name: "mock",
    createPayment: vi.fn(),
    confirmPayment: vi.fn(),
    refundPayment: vi.fn(),
  },
}));

vi.mock("../../cart/cart.repository.js", () => ({
  findOrCreateCart: vi.fn(),
  clearCart: vi.fn(),
}));

vi.mock("../../products/products.repository.js", () => ({
  findProductRecordsByIds: vi.fn(),
  decrementProductStocks: vi.fn(),
  incrementProductStocks: vi.fn(),
}));

vi.mock("../../auth/auth.repository.js", () => ({
  findUserById: vi.fn(),
}));

vi.mock("../../addresses/addresses.repository.js", () => ({
  findAddressById: vi.fn(),
}));

vi.mock("../../orders/orders.repository.js", () => ({
  findOrderById: vi.fn(),
}));

vi.mock("../checkout.repository.js", () => ({
  createPaymentRecord: vi.fn(),
  findPaymentByOrderId: vi.fn(),
  markPaymentPaid: vi.fn(),
  markPaymentFailed: vi.fn(),
  markPaymentRefunded: vi.fn(),
  updateOrderStatus: vi.fn(),
}));

vi.mock("../../../lib/mail.js", () => ({
  isMailConfigured: vi.fn().mockReturnValue(false),
  sendMail: vi.fn(),
}));

import { prisma } from "../../../lib/db/prisma.js";
import { paymentProvider } from "../../../lib/payment/index.js";
import { findOrCreateCart, clearCart } from "../../cart/cart.repository.js";
import {
  findProductRecordsByIds,
  decrementProductStocks,
  incrementProductStocks,
} from "../../products/products.repository.js";
import { findAddressById } from "../../addresses/addresses.repository.js";
import {
  createPaymentRecord,
  findPaymentByOrderId,
  markPaymentPaid,
  markPaymentFailed,
} from "../checkout.repository.js";
import { initiateCheckout, confirmPayment } from "../checkout.service.js";

const INLINE_ADDRESS = {
  name: "John Doe",
  address: "123 Main St",
  city: "Springfield",
  postal: "12345",
  country: "US",
};

const MOCK_PRODUCT = {
  id: "prod-1",
  name: "Widget",
  price: 1000,
  stock: 10,
  slug: "widget",
  sortOrder: 1,
  category: "electronics",
  description: "A widget",
  image: "img.jpg",
  highlights: [] as string[],
  includes: [] as string[],
};

const MOCK_ORDER_ROW = {
  id: "order-1",
  userId: "user-1",
  status: "PENDING_PAYMENT",
  total: 2000,
  shipName: INLINE_ADDRESS.name,
  shipAddress: INLINE_ADDRESS.address,
  shipCity: INLINE_ADDRESS.city,
  shipPostal: INLINE_ADDRESS.postal,
  shipCountry: INLINE_ADDRESS.country,
  items: [{ id: "item-1", productId: "prod-1", name: "Widget", price: 1000, quantity: 2 }],
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

const MOCK_PAYMENT = {
  id: "payment-1",
  orderId: "order-1",
  status: "pending" as const,
  amount: 2000,
  provider: "mock",
  providerRefId: "pi_123",
  createdAt: "2024-01-01T00:00:00.000Z",
};

describe("initiateCheckout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.order.findFirst).mockResolvedValue(null);
    vi.mocked(findOrCreateCart).mockResolvedValue({
      id: "cart-1",
      userId: "user-1",
      items: [{ productId: "prod-1", quantity: 2 }],
    } as any);
    vi.mocked(findProductRecordsByIds).mockResolvedValue([MOCK_PRODUCT]);
    vi.mocked(decrementProductStocks).mockResolvedValue(undefined);
    vi.mocked(incrementProductStocks).mockResolvedValue(undefined);
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => fn(prisma));
    vi.mocked(prisma.order.create).mockResolvedValue(MOCK_ORDER_ROW as any);
    vi.mocked(paymentProvider.createPayment).mockResolvedValue({
      providerRefId: "pi_123",
      status: "pending",
      clientSecret: "secret_123",
    });
    vi.mocked(createPaymentRecord).mockResolvedValue({
      ...MOCK_PAYMENT,
      clientSecret: "secret_123",
    });
  });

  it("throws 409 when user already has a pending checkout", async () => {
    vi.mocked(prisma.order.findFirst).mockResolvedValue({ id: "existing" } as any);
    await expect(
      initiateCheckout({ userId: "user-1", shippingAddress: INLINE_ADDRESS })
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("throws 400 when cart is empty", async () => {
    vi.mocked(findOrCreateCart).mockResolvedValue({
      id: "cart-1",
      userId: "user-1",
      items: [],
    } as any);
    await expect(
      initiateCheckout({ userId: "user-1", shippingAddress: INLINE_ADDRESS })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("throws 400 when a cart product no longer exists", async () => {
    vi.mocked(findProductRecordsByIds).mockResolvedValue([]);
    await expect(
      initiateCheckout({ userId: "user-1", shippingAddress: INLINE_ADDRESS })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("throws 400 when a product has insufficient stock (pre-check)", async () => {
    vi.mocked(findProductRecordsByIds).mockResolvedValue([{ ...MOCK_PRODUCT, stock: 1 }]);
    await expect(
      initiateCheckout({ userId: "user-1", shippingAddress: INLINE_ADDRESS })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("throws 400 when stock race condition is caught inside the transaction", async () => {
    vi.mocked(decrementProductStocks).mockRejectedValue(
      new Error("INSUFFICIENT_STOCK:prod-1")
    );
    await expect(
      initiateCheckout({ userId: "user-1", shippingAddress: INLINE_ADDRESS })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("restores stock and cancels the order when payment initiation fails", async () => {
    vi.mocked(paymentProvider.createPayment).mockRejectedValue(new Error("Gateway error"));
    vi.mocked(prisma.order.update).mockResolvedValue({} as any);

    await expect(
      initiateCheckout({ userId: "user-1", shippingAddress: INLINE_ADDRESS })
    ).rejects.toMatchObject({ statusCode: 502 });

    expect(incrementProductStocks).toHaveBeenCalledWith([{ productId: "prod-1", quantity: 2 }]);
    expect(prisma.order.update).toHaveBeenCalledWith({
      where: { id: "order-1" },
      data: { status: "CANCELLED" },
    });
  });

  it("creates order and returns clientSecret on success with inline address", async () => {
    const result = await initiateCheckout({ userId: "user-1", shippingAddress: INLINE_ADDRESS });
    expect(decrementProductStocks).toHaveBeenCalled();
    expect(createPaymentRecord).toHaveBeenCalled();
    expect(result.order.total).toBe(2000);
    expect(result.payment.clientSecret).toBe("secret_123");
  });

  it("resolves a savedAddressId and uses it as the shipping address", async () => {
    vi.mocked(findAddressById).mockResolvedValue({
      id: "addr-1",
      userId: "user-1",
      label: "Home",
      name: "Jane Doe",
      address: "99 Oak Ave",
      city: "Shelbyville",
      postal: "54321",
      country: "US",
      isDefault: true,
      createdAt: "2024-01-01T00:00:00.000Z",
    });

    await initiateCheckout({ userId: "user-1", savedAddressId: "addr-1" });

    expect(findAddressById).toHaveBeenCalledWith("addr-1");
    expect(prisma.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ shipName: "Jane Doe", shipCity: "Shelbyville" }),
      })
    );
  });

  it("throws 404 when savedAddressId does not exist", async () => {
    vi.mocked(findAddressById).mockResolvedValue(null);
    await expect(
      initiateCheckout({ userId: "user-1", savedAddressId: "bad-id" })
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("throws 403 when saved address belongs to another user", async () => {
    vi.mocked(findAddressById).mockResolvedValue({
      id: "addr-1",
      userId: "other-user",
      label: null,
      name: "Other",
      address: "1 St",
      city: "City",
      postal: "00000",
      country: "US",
      isDefault: false,
      createdAt: "2024-01-01T00:00:00.000Z",
    });
    await expect(
      initiateCheckout({ userId: "user-1", savedAddressId: "addr-1" })
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});

describe("confirmPayment", () => {
  const PENDING_ORDER = {
    ...MOCK_ORDER_ROW,
    status: "PENDING_PAYMENT",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.order.findUnique).mockResolvedValue(PENDING_ORDER as any);
    vi.mocked(findPaymentByOrderId).mockResolvedValue(MOCK_PAYMENT);
    vi.mocked(paymentProvider.confirmPayment).mockResolvedValue({
      providerRefId: "pi_123",
      status: "paid",
    });
    vi.mocked(markPaymentPaid).mockResolvedValue({ ...MOCK_PAYMENT, status: "paid" });
    vi.mocked(prisma.order.update).mockResolvedValue({} as any);
    vi.mocked(prisma.order.findUniqueOrThrow).mockResolvedValue({
      ...PENDING_ORDER,
      status: "CONFIRMED",
    } as any);
  });

  it("throws 404 when the order does not exist", async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue(null);
    await expect(confirmPayment({ orderId: "order-1", userId: "user-1" })).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it("throws 403 when the order belongs to a different user", async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({
      ...PENDING_ORDER,
      userId: "other-user",
    } as any);
    await expect(confirmPayment({ orderId: "order-1", userId: "user-1" })).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it("throws 400 when the order is not in PENDING_PAYMENT status", async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({
      ...PENDING_ORDER,
      status: "CONFIRMED",
    } as any);
    await expect(confirmPayment({ orderId: "order-1", userId: "user-1" })).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("marks payment paid, confirms order, and clears cart on success", async () => {
    await confirmPayment({ orderId: "order-1", userId: "user-1" });

    expect(markPaymentPaid).toHaveBeenCalledWith("order-1", "pi_123");
    expect(prisma.order.update).toHaveBeenCalledWith({
      where: { id: "order-1" },
      data: { status: "CONFIRMED" },
    });
    expect(clearCart).toHaveBeenCalledWith("user-1");
  });

  it("marks payment failed, cancels order, and restores stock when provider returns failed", async () => {
    vi.mocked(paymentProvider.confirmPayment).mockResolvedValue({
      providerRefId: "pi_123",
      status: "failed",
    });
    vi.mocked(markPaymentFailed).mockResolvedValue({ ...MOCK_PAYMENT, status: "failed" });
    vi.mocked(prisma.order.findUniqueOrThrow).mockResolvedValue({
      ...PENDING_ORDER,
      status: "CANCELLED",
    } as any);

    const result = await confirmPayment({ orderId: "order-1", userId: "user-1" });

    expect(markPaymentFailed).toHaveBeenCalledWith("order-1");
    expect(prisma.order.update).toHaveBeenCalledWith({
      where: { id: "order-1" },
      data: { status: "CANCELLED" },
    });
    expect(incrementProductStocks).toHaveBeenCalledWith([
      { productId: "prod-1", quantity: 2 },
    ]);
    expect(result.order.status).toBe("cancelled");
  });

  it("marks payment failed and restores stock when provider throws", async () => {
    vi.mocked(paymentProvider.confirmPayment).mockRejectedValue(new Error("Timeout"));
    vi.mocked(markPaymentFailed).mockResolvedValue({ ...MOCK_PAYMENT, status: "failed" });
    vi.mocked(prisma.order.findUniqueOrThrow).mockResolvedValue({
      ...PENDING_ORDER,
      status: "CANCELLED",
    } as any);

    await expect(confirmPayment({ orderId: "order-1", userId: "user-1" })).rejects.toMatchObject({
      statusCode: 502,
    });

    expect(markPaymentFailed).toHaveBeenCalledWith("order-1");
    expect(incrementProductStocks).toHaveBeenCalledWith([
      { productId: "prod-1", quantity: 2 },
    ]);
  });
});
