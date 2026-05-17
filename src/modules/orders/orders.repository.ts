import { prisma } from "../../lib/db/prisma.js";
import type { CreateOrderData, OrderItemRecord, OrderRecord } from "./orders.types.js";

export async function createOrderRecord(input: CreateOrderData): Promise<OrderRecord> {
  const order = await prisma.order.create({
    data: {
      userId: input.userId,
      total: input.total,
      shipName: input.shippingAddress.name,
      shipAddress: input.shippingAddress.address,
      shipCity: input.shippingAddress.city,
      shipPostal: input.shippingAddress.postal,
      shipCountry: input.shippingAddress.country,
      items: {
        create: input.items.map((item) => ({
          productId: item.productId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
      },
    },
    include: { items: true },
  });

  return mapOrderRecord(order);
}

export async function findOrdersByUserId(userId: string): Promise<OrderRecord[]> {
  const orders = await prisma.order.findMany({
    where: { userId },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });

  return orders.map(mapOrderRecord);
}

export async function findOrdersByUserIdPaginated(
  userId: string,
  page: number,
  limit: number
): Promise<{ orders: OrderRecord[]; total: number }> {
  const skip = (page - 1) * limit;
  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where: { userId },
      include: { items: true },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.order.count({ where: { userId } }),
  ]);
  return { orders: orders.map(mapOrderRecord), total };
}

export async function findOrderById(id: string): Promise<OrderRecord | null> {
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true },
  });

  return order ? mapOrderRecord(order) : null;
}

export async function listAllOrdersPaginated(
  page: number,
  limit: number
): Promise<{ orders: OrderRecord[]; total: number }> {
  const skip = (page - 1) * limit;
  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      include: { items: true },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.order.count(),
  ]);

  return { orders: orders.map(mapOrderRecord), total };
}

export async function cancelOrderRecord(id: string): Promise<OrderRecord | null> {
  try {
    const order = await prisma.order.update({
      where: { id },
      data: { status: "CANCELLED" },
      include: { items: true },
    });
    return mapOrderRecord(order);
  } catch (e: unknown) {
    const prismaError = e as { code?: string };
    if (prismaError.code === "P2025") return null;
    throw e;
  }
}

export async function updateOrderStatusRecord(
  id: string,
  status: "CONFIRMED" | "SHIPPED" | "DELIVERED"
): Promise<OrderRecord | null> {
  try {
    const order = await prisma.order.update({
      where: { id },
      data: { status },
      include: { items: true },
    });
    return mapOrderRecord(order);
  } catch (e: unknown) {
    const prismaError = e as { code?: string };
    if (prismaError.code === "P2025") return null;
    throw e;
  }
}

function mapOrderRecord(order: {
  id: string;
  userId: string;
  status: string;
  total: number;
  shipName: string;
  shipAddress: string;
  shipCity: string;
  shipPostal: string;
  shipCountry: string;
  createdAt: Date;
  items: Array<{
    id: string;
    productId: string;
    name: string;
    price: number;
    quantity: number;
  }>;
}): OrderRecord {
  return {
    id: order.id,
    userId: order.userId,
    status: order.status.toLowerCase() as OrderRecord["status"],
    total: order.total,
    shipName: order.shipName,
    shipAddress: order.shipAddress,
    shipCity: order.shipCity,
    shipPostal: order.shipPostal,
    shipCountry: order.shipCountry,
    items: order.items.map(mapOrderItemRecord),
    createdAt: order.createdAt.toISOString(),
  };
}

function mapOrderItemRecord(item: {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
}): OrderItemRecord {
  return {
    id: item.id,
    productId: item.productId,
    name: item.name,
    price: item.price,
    quantity: item.quantity,
  };
}
