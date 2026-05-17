import { buildPaginationMeta } from "../../lib/pagination.js";
import { HttpError } from "../../lib/httpError.js";
import { findProductRecordsByIds, incrementProductStocks } from "../products/products.repository.js";
import {
  cancelOrderRecord,
  createOrderRecord,
  findOrderById,
  findOrdersByUserId,
  findOrdersByUserIdPaginated,
  listAllOrdersPaginated,
  updateOrderStatusRecord,
} from "./orders.repository.js";
import type { AdminOrderStatus, CreateOrderInput } from "./orders.types.js";
import { isValidTransition } from "./orders.types.js";

export async function createOrder(input: CreateOrderInput) {
  const productIds = input.items.map((i) => i.productId);
  const products = await findProductRecordsByIds(productIds);
  const productMap = new Map(products.map((p) => [p.id, p]));

  const missing = productIds.filter((id) => !productMap.has(id));
  if (missing.length > 0) {
    throw new HttpError(400, `Product(s) not found: ${missing.join(", ")}`);
  }

  const enrichedItems = input.items.map((item) => {
    const product = productMap.get(item.productId)!;
    return { productId: item.productId, name: product.name, price: product.price, quantity: item.quantity };
  });

  const total = enrichedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return createOrderRecord({ userId: input.userId, total, items: enrichedItems, shippingAddress: input.shippingAddress });
}

export async function getOrdersByUser(userId: string, page: number, limit: number) {
  const { orders, total } = await findOrdersByUserIdPaginated(userId, page, limit);
  return {
    data: orders,
    meta: buildPaginationMeta(total, page, limit),
  };
}

export async function getAllOrdersForUser(userId: string) {
  return findOrdersByUserId(userId);
}

export async function getOrderById(id: string, userId: string) {
  const order = await findOrderById(id);

  if (!order || order.userId !== userId) {
    throw new HttpError(404, `Order "${id}" was not found.`);
  }

  return order;
}

export async function adminListOrders(page: number, limit: number) {
  const { orders, total } = await listAllOrdersPaginated(page, limit);
  return {
    data: orders,
    meta: buildPaginationMeta(total, page, limit),
  };
}

export async function cancelOrder(id: string, userId: string) {
  const order = await findOrderById(id);

  if (!order) {
    throw new HttpError(404, `Order "${id}" was not found.`);
  }

  if (order.userId !== userId) {
    throw new HttpError(403, "You do not have access to this order.");
  }

  if (order.status !== "pending_payment" && order.status !== "pending") {
    throw new HttpError(400, `Order cannot be cancelled in status "${order.status}".`);
  }

  const cancelled = await cancelOrderRecord(id);

  // Stock is decremented at checkout initiation; restore it when a PENDING_PAYMENT order is cancelled
  if (order.status === "pending_payment" && order.items.length > 0) {
    await incrementProductStocks(
      order.items.map((i) => ({ productId: i.productId, quantity: i.quantity }))
    );
  }

  return cancelled;
}

export async function adminUpdateOrderStatus(id: string, next: AdminOrderStatus) {
  const order = await findOrderById(id);

  if (!order) {
    throw new HttpError(404, `Order "${id}" was not found.`);
  }

  if (!isValidTransition(order.status, next)) {
    throw new HttpError(
      400,
      `Cannot transition order from "${order.status}" to "${next}".`
    );
  }

  return updateOrderStatusRecord(id, next.toUpperCase() as "CONFIRMED" | "SHIPPED" | "DELIVERED");
}
