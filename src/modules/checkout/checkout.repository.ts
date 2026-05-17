import { prisma } from "../../lib/db/prisma.js";
import type { PaymentRecord } from "./checkout.types.js";

type CreatePaymentData = {
  orderId: string;
  amount: number;
  provider: string;
  providerRefId: string;
};

export async function createPaymentRecord(data: CreatePaymentData): Promise<PaymentRecord> {
  const payment = await prisma.payment.create({
    data: {
      orderId: data.orderId,
      amount: data.amount,
      provider: data.provider,
      providerRefId: data.providerRefId,
      status: "PENDING",
    },
  });
  return mapPaymentRecord(payment);
}

export async function findPaymentByOrderId(orderId: string): Promise<PaymentRecord | null> {
  const payment = await prisma.payment.findUnique({ where: { orderId } });
  return payment ? mapPaymentRecord(payment) : null;
}

export async function findPaymentByStripeEventId(stripeEventId: string): Promise<PaymentRecord | null> {
  const payment = await prisma.payment.findUnique({ where: { stripeEventId } });
  return payment ? mapPaymentRecord(payment) : null;
}

export async function markPaymentPaid(
  orderId: string,
  providerRefId: string,
  stripeEventId?: string
): Promise<PaymentRecord> {
  const payment = await prisma.payment.update({
    where: { orderId },
    data: { status: "PAID", providerRefId, ...(stripeEventId ? { stripeEventId } : {}) },
  });
  return mapPaymentRecord(payment);
}

export async function markPaymentFailed(orderId: string): Promise<PaymentRecord> {
  const payment = await prisma.payment.update({
    where: { orderId },
    data: { status: "FAILED" },
  });
  return mapPaymentRecord(payment);
}

export async function markPaymentRefunded(orderId: string): Promise<PaymentRecord> {
  const payment = await prisma.payment.update({
    where: { orderId },
    data: { status: "REFUNDED" },
  });
  return mapPaymentRecord(payment);
}

export async function updateOrderStatus(
  orderId: string,
  status: "PENDING_PAYMENT" | "PENDING" | "CONFIRMED" | "SHIPPED" | "DELIVERED" | "CANCELLED"
): Promise<void> {
  await prisma.order.update({ where: { id: orderId }, data: { status } });
}

function mapPaymentRecord(payment: {
  id: string;
  orderId: string;
  status: string;
  amount: number;
  provider: string;
  providerRefId: string | null;
  stripeEventId: string | null;
  createdAt: Date;
}): PaymentRecord {
  return {
    id: payment.id,
    orderId: payment.orderId,
    status: payment.status.toLowerCase() as PaymentRecord["status"],
    amount: payment.amount,
    provider: payment.provider,
    providerRefId: payment.providerRefId,
    createdAt: payment.createdAt.toISOString(),
  };
}
