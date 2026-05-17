import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/db/prisma.js";
import { HttpError } from "../../lib/httpError.js";
import { logger } from "../../lib/logger.js";
import { isMailConfigured, sendMail } from "../../lib/mail.js";
import { paymentProvider } from "../../lib/payment/index.js";
import { findUserById } from "../auth/auth.repository.js";
import { clearCart, findOrCreateCart } from "../cart/cart.repository.js";
import { findOrderById } from "../orders/orders.repository.js";
import { decrementProductStocks, incrementProductStocks, findProductRecordsByIds } from "../products/products.repository.js";
import { findAddressById } from "../addresses/addresses.repository.js";
import {
  createPaymentRecord,
  findPaymentByOrderId,
  markPaymentFailed,
  markPaymentPaid,
  markPaymentRefunded,
  updateOrderStatus,
} from "./checkout.repository.js";
import type { ConfirmPaymentInput, InitiateCheckoutInput, ShippingAddressInput } from "./checkout.types.js";

export async function initiateCheckout(input: InitiateCheckoutInput) {
  // Resolve shipping address — either from saved address book or inline
  let shippingAddress: ShippingAddressInput;
  if (input.savedAddressId) {
    const saved = await findAddressById(input.savedAddressId);
    if (!saved) {
      throw new HttpError(404, "Saved address not found.");
    }
    if (saved.userId !== input.userId) {
      throw new HttpError(403, "Address does not belong to you.");
    }
    shippingAddress = {
      name: saved.name,
      address: saved.address,
      city: saved.city,
      postal: saved.postal,
      country: saved.country,
    };
  } else if (input.shippingAddress) {
    shippingAddress = input.shippingAddress;
  } else {
    throw new HttpError(400, "Shipping address is required.");
  }

  const existingPending = await prisma.order.findFirst({
    where: { userId: input.userId, status: "PENDING_PAYMENT" },
  });
  if (existingPending) {
    throw new HttpError(409, "You already have a pending checkout. Complete or cancel it before starting a new one.");
  }

  const cart = await findOrCreateCart(input.userId);

  if (cart.items.length === 0) {
    throw new HttpError(400, "Cart is empty.");
  }

  const productIds = cart.items.map((i) => i.productId);
  const products = await findProductRecordsByIds(productIds);
  const productMap = new Map(products.map((p) => [p.id, p]));

  const missing = productIds.filter((id) => !productMap.has(id));
  if (missing.length > 0) {
    throw new HttpError(400, `Product(s) no longer available: ${missing.join(", ")}`);
  }

  const outOfStock = cart.items.filter((item) => {
    const product = productMap.get(item.productId)!;
    return product.stock < item.quantity;
  });
  if (outOfStock.length > 0) {
    const names = outOfStock.map((i) => productMap.get(i.productId)!.name);
    throw new HttpError(400, `Insufficient stock for: ${names.join(", ")}`);
  }

  const enrichedItems = cart.items.map((item) => {
    const product = productMap.get(item.productId)!;
    return {
      productId: item.productId,
      name: product.name,
      price: product.price,
      quantity: item.quantity,
    };
  });

  const total = enrichedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Atomically decrement stock and create the order to prevent race conditions
  let order: Prisma.OrderGetPayload<{ include: { items: true } }>;
  try {
    order = await prisma.$transaction(async (tx) => {
      await decrementProductStocks(
        enrichedItems.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        tx
      );
      return tx.order.create({
        data: {
          userId: input.userId,
          status: "PENDING_PAYMENT",
          total,
          shipName: shippingAddress.name,
          shipAddress: shippingAddress.address,
          shipCity: shippingAddress.city,
          shipPostal: shippingAddress.postal,
          shipCountry: shippingAddress.country,
          items: {
            create: enrichedItems.map((item) => ({
              productId: item.productId,
              name: item.name,
              price: item.price,
              quantity: item.quantity,
            })),
          },
        },
        include: { items: true },
      });
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.startsWith("INSUFFICIENT_STOCK:")) {
      const productId = msg.split(":")[1];
      const name = productMap.get(productId ?? "")?.name ?? productId;
      throw new HttpError(400, `Insufficient stock for: ${name}`);
    }
    throw e;
  }

  let paymentResult;
  try {
    paymentResult = await paymentProvider.createPayment({
      amount: total,
      orderId: order.id,
    });
  } catch {
    // Stock was decremented in the transaction; restore it since payment initiation failed
    await incrementProductStocks(
      enrichedItems.map((i) => ({ productId: i.productId, quantity: i.quantity }))
    );
    await prisma.order.update({ where: { id: order.id }, data: { status: "CANCELLED" } });
    throw new HttpError(502, "Could not initiate payment.");
  }

  const payment = await createPaymentRecord({
    orderId: order.id,
    amount: total,
    provider: paymentProvider.name,
    providerRefId: paymentResult.providerRefId,
  });

  const orderRecord = {
    id: order.id,
    userId: order.userId,
    status: "pending_payment" as const,
    total: order.total,
    shipName: order.shipName,
    shipAddress: order.shipAddress,
    shipCity: order.shipCity,
    shipPostal: order.shipPostal,
    shipCountry: order.shipCountry,
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
    })),
    createdAt: order.createdAt.toISOString(),
  };

  return {
    order: orderRecord,
    payment: {
      ...payment,
      clientSecret: paymentResult.clientSecret,
    },
  };
}

export async function confirmPayment(input: ConfirmPaymentInput) {
  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    include: { items: true },
  });

  if (!order) {
    throw new HttpError(404, `Order "${input.orderId}" was not found.`);
  }

  if (order.userId !== input.userId) {
    throw new HttpError(403, "You do not have access to this order.");
  }

  if (order.status !== "PENDING_PAYMENT") {
    throw new HttpError(400, "This order is not awaiting payment.");
  }

  const payment = await findPaymentByOrderId(input.orderId);
  if (!payment) {
    throw new HttpError(404, "Payment record not found.");
  }

  const orderItems = order.items.map((i) => ({ productId: i.productId, quantity: i.quantity }));

  let confirmedPayment;
  try {
    const result = await paymentProvider.confirmPayment(payment.providerRefId ?? "");

    if (result.status === "paid") {
      confirmedPayment = await markPaymentPaid(input.orderId, result.providerRefId);
      await prisma.order.update({ where: { id: input.orderId }, data: { status: "CONFIRMED" } });
      await clearCart(input.userId);
      void sendOrderConfirmationEmail(input.userId, input.orderId);
    } else {
      confirmedPayment = await markPaymentFailed(input.orderId);
      await prisma.order.update({ where: { id: input.orderId }, data: { status: "CANCELLED" } });
      await incrementProductStocks(orderItems);
    }
  } catch {
    confirmedPayment = await markPaymentFailed(input.orderId);
    await prisma.order.update({ where: { id: input.orderId }, data: { status: "CANCELLED" } });
    await incrementProductStocks(orderItems);
    throw new HttpError(502, "Payment processing failed.");
  }

  const updatedOrder = await prisma.order.findUniqueOrThrow({
    where: { id: input.orderId },
    include: { items: true },
  });

  const orderRecord = {
    id: updatedOrder.id,
    userId: updatedOrder.userId,
    status: updatedOrder.status.toLowerCase() as "confirmed" | "cancelled",
    total: updatedOrder.total,
    shipName: updatedOrder.shipName,
    shipAddress: updatedOrder.shipAddress,
    shipCity: updatedOrder.shipCity,
    shipPostal: updatedOrder.shipPostal,
    shipCountry: updatedOrder.shipCountry,
    items: updatedOrder.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
    })),
    createdAt: updatedOrder.createdAt.toISOString(),
  };

  return { order: orderRecord, payment: confirmedPayment };
}

export async function adminRefundOrder(orderId: string) {
  const order = await findOrderById(orderId);

  if (!order) {
    throw new HttpError(404, `Order "${orderId}" was not found.`);
  }

  const refundableStatuses = ["confirmed", "shipped", "delivered"] as const;
  if (!refundableStatuses.includes(order.status as typeof refundableStatuses[number])) {
    throw new HttpError(400, `Order cannot be refunded in status "${order.status}".`);
  }

  const payment = await findPaymentByOrderId(orderId);
  if (!payment) {
    throw new HttpError(404, "Payment record not found.");
  }

  if (payment.status !== "paid") {
    throw new HttpError(400, "Only paid orders can be refunded.");
  }

  if (!payment.providerRefId) {
    throw new HttpError(400, "Payment has no provider reference ID.");
  }

  await paymentProvider.refundPayment(payment.providerRefId);
  const refundedPayment = await markPaymentRefunded(orderId);

  const orderWithItems = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { items: true },
  });
  await incrementProductStocks(
    orderWithItems.items.map((i) => ({ productId: i.productId, quantity: i.quantity }))
  );

  await updateOrderStatus(orderId, "CANCELLED");

  const updatedOrder = await findOrderById(orderId);
  void sendRefundEmail(order.userId, orderId);
  return { order: updatedOrder!, payment: refundedPayment };
}

async function sendOrderConfirmationEmail(userId: string, orderId: string): Promise<void> {
  if (!isMailConfigured()) return;

  try {
    const user = await findUserById(userId);
    if (!user?.email) return;

    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order) return;

    const itemLines = order.items
      .map((item) => `  ${item.name} x${item.quantity}  —  $${(item.price / 100).toFixed(2)}`)
      .join("\n");

    const totalFormatted = `$${(order.total / 100).toFixed(2)}`;

    const text = [
      `Your order has been confirmed!`,
      ``,
      `Order ID: ${order.id}`,
      ``,
      `Items:`,
      itemLines,
      ``,
      `Total: ${totalFormatted}`,
      ``,
      `Shipping to:`,
      `  ${order.shipName}`,
      `  ${order.shipAddress}`,
      `  ${order.shipCity}, ${order.shipPostal}`,
      `  ${order.shipCountry}`,
    ].join("\n");

    const html = `
<p>Your order has been confirmed!</p>
<p><strong>Order ID:</strong> ${order.id}</p>
<table cellpadding="4" style="border-collapse:collapse">
  <thead>
    <tr><th align="left">Item</th><th align="right">Qty</th><th align="right">Price</th></tr>
  </thead>
  <tbody>
    ${order.items
      .map(
        (item) => `<tr>
      <td>${item.name}</td>
      <td align="right">${item.quantity}</td>
      <td align="right">$${(item.price / 100).toFixed(2)}</td>
    </tr>`
      )
      .join("")}
  </tbody>
  <tfoot>
    <tr><td colspan="2"><strong>Total</strong></td><td align="right"><strong>${totalFormatted}</strong></td></tr>
  </tfoot>
</table>
<p>
  <strong>Shipping to:</strong><br>
  ${order.shipName}<br>${order.shipAddress}<br>${order.shipCity}, ${order.shipPostal}<br>${order.shipCountry}
</p>`;

    await sendMail({ to: user.email, subject: `Order ${order.id} confirmed`, text, html });
  } catch (err) {
    logger.error({ err }, "Failed to send order confirmation email");
  }
}

async function sendRefundEmail(userId: string, orderId: string): Promise<void> {
  if (!isMailConfigured()) return;

  try {
    const user = await findUserById(userId);
    if (!user?.email) return;

    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order) return;

    const itemLines = order.items
      .map((item) => `  ${item.name} x${item.quantity}  —  $${(item.price / 100).toFixed(2)}`)
      .join("\n");

    const totalFormatted = `$${(order.total / 100).toFixed(2)}`;

    const text = [
      `Your refund has been processed.`,
      ``,
      `Order ID: ${order.id}`,
      ``,
      `Refunded items:`,
      itemLines,
      ``,
      `Refund amount: ${totalFormatted}`,
      ``,
      `Please allow a few business days for the refund to appear on your statement.`,
    ].join("\n");

    const html = `
<p>Your refund has been processed.</p>
<p><strong>Order ID:</strong> ${order.id}</p>
<table cellpadding="4" style="border-collapse:collapse">
  <thead>
    <tr><th align="left">Item</th><th align="right">Qty</th><th align="right">Price</th></tr>
  </thead>
  <tbody>
    ${order.items
      .map(
        (item) => `<tr>
      <td>${item.name}</td>
      <td align="right">${item.quantity}</td>
      <td align="right">$${(item.price / 100).toFixed(2)}</td>
    </tr>`
      )
      .join("")}
  </tbody>
  <tfoot>
    <tr><td colspan="2"><strong>Refund amount</strong></td><td align="right"><strong>${totalFormatted}</strong></td></tr>
  </tfoot>
</table>
<p>Please allow a few business days for the refund to appear on your statement.</p>`;

    await sendMail({ to: user.email, subject: `Refund processed for order ${order.id}`, text, html });
  } catch (err) {
    logger.error({ err }, "Failed to send refund email");
  }
}
