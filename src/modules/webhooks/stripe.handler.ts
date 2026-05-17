import type { Request, Response } from "express";
import Stripe from "stripe";
import { env } from "../../config/env.js";
import { logger } from "../../lib/logger.js";
import { isMailConfigured, sendMail } from "../../lib/mail.js";
import { findUserById } from "../auth/auth.repository.js";
import { clearCart } from "../cart/cart.repository.js";
import {
  findPaymentByOrderId,
  findPaymentByStripeEventId,
  markPaymentFailed,
  markPaymentPaid,
  updateOrderStatus,
} from "../checkout/checkout.repository.js";
import { findOrderById } from "../orders/orders.repository.js";
import { incrementProductStocks } from "../products/products.repository.js";
import type { OrderRecord } from "../orders/orders.types.js";

export async function handleStripeWebhook(req: Request, res: Response): Promise<void> {
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET) {
    res.status(400).json({ message: "Stripe is not configured." });
    return;
  }

  const sig = req.headers["stripe-signature"];
  if (!sig) {
    res.status(400).json({ message: "Missing stripe-signature header." });
    return;
  }

  const stripe = new Stripe(env.STRIPE_SECRET_KEY);
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body as Buffer, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch {
    res.status(400).json({ message: "Webhook signature verification failed." });
    return;
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded":
        await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent, event.id);
        break;
      case "payment_intent.payment_failed":
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;
    }
  } catch (err) {
    logger.error({ err, eventId: event.id, eventType: event.type }, "Webhook processing error");
    res.status(500).json({ message: "Webhook processing failed." });
    return;
  }

  res.json({ received: true });
}

async function handlePaymentSucceeded(intent: Stripe.PaymentIntent, eventId: string): Promise<void> {
  const orderId = intent.metadata?.orderId;
  if (!orderId) return;

  // True idempotency: skip if this exact Stripe event was already processed
  const existingByEvent = await findPaymentByStripeEventId(eventId);
  if (existingByEvent) return;

  const order = await findOrderById(orderId);
  if (!order || order.status === "confirmed") return;

  const payment = await findPaymentByOrderId(orderId);
  if (!payment || payment.status === "paid") return;

  await markPaymentPaid(orderId, intent.id, eventId);
  await updateOrderStatus(orderId, "CONFIRMED");
  await clearCart(order.userId);

  if (isMailConfigured()) {
    const user = await findUserById(order.userId);
    if (user?.email) {
      sendOrderConfirmationEmail(user.email, order).catch((err) =>
        logger.error({ err }, "Failed to send order confirmation email")
      );
    }
  }
}

async function handlePaymentFailed(intent: Stripe.PaymentIntent): Promise<void> {
  const orderId = intent.metadata?.orderId;
  if (!orderId) return;

  const order = await findOrderById(orderId);
  if (!order || order.status === "cancelled") return;

  await markPaymentFailed(orderId);
  await updateOrderStatus(orderId, "CANCELLED");

  // Restore stock that was decremented when checkout was initiated
  if (order.items.length > 0) {
    await incrementProductStocks(
      order.items.map((i) => ({ productId: i.productId, quantity: i.quantity }))
    );
  }
}

async function sendOrderConfirmationEmail(email: string, order: OrderRecord): Promise<void> {
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
    <tr>
      <th align="left">Item</th>
      <th align="right">Qty</th>
      <th align="right">Price</th>
    </tr>
  </thead>
  <tbody>
    ${order.items
      .map(
        (item) => `
    <tr>
      <td>${item.name}</td>
      <td align="right">${item.quantity}</td>
      <td align="right">$${(item.price / 100).toFixed(2)}</td>
    </tr>`
      )
      .join("")}
  </tbody>
  <tfoot>
    <tr>
      <td colspan="2"><strong>Total</strong></td>
      <td align="right"><strong>${totalFormatted}</strong></td>
    </tr>
  </tfoot>
</table>
<p>
  <strong>Shipping to:</strong><br>
  ${order.shipName}<br>
  ${order.shipAddress}<br>
  ${order.shipCity}, ${order.shipPostal}<br>
  ${order.shipCountry}
</p>`;

  await sendMail({ to: email, subject: `Order ${order.id} confirmed`, text, html });
}
