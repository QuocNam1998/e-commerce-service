import type { NextFunction, Request, Response } from "express";
import { paginationQuerySchema } from "../../lib/pagination.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { cancelOrder, createOrder, getAllOrdersForUser, getOrderById, getOrdersByUser } from "./orders.service.js";
import { createOrderSchema, orderIdParamsSchema } from "./orders.validation.js";
import type {
  FrontendOrderDetailResponse,
  FrontendOrderStatus,
  FrontendOrderSummaryResponse,
  OrderRecord,
} from "./orders.types.js";

const CURRENCY = "usd";
const ESTIMATED_DELIVERY_DAYS = 7;

function toFrontendStatus(status: string): FrontendOrderStatus {
  if (status === "pending_payment") return "pending";
  return status as FrontendOrderStatus;
}

function estimatedDelivery(createdAt: string): string {
  const date = new Date(createdAt);
  date.setDate(date.getDate() + ESTIMATED_DELIVERY_DAYS);
  return date.toISOString();
}

function formatOrderDetail(order: OrderRecord): FrontendOrderDetailResponse {
  return {
    id: order.id,
    status: toFrontendStatus(order.status),
    total: order.total,
    currency: CURRENCY,
    createdAt: order.createdAt,
    estimatedDelivery: estimatedDelivery(order.createdAt),
    items: order.items.map((item) => ({
      productId: item.productId,
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.price,
    })),
    shippingAddress: {
      line1: order.shipAddress,
      line2: null,
      city: order.shipCity,
      postalCode: order.shipPostal,
      country: order.shipCountry,
    },
  };
}

function formatOrderSummary(order: OrderRecord): FrontendOrderSummaryResponse {
  return {
    id: order.id,
    status: toFrontendStatus(order.status),
    total: order.total,
    currency: CURRENCY,
    createdAt: order.createdAt,
    estimatedDelivery: estimatedDelivery(order.createdAt),
  };
}

export async function handleCreateOrder(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const user = response.locals.user as AuthenticatedUser;
    const input = createOrderSchema.parse(request.body);

    const order = await createOrder({
      userId: user.id,
      items: input.items,
      shippingAddress: input.shippingAddress,
    });

    response.status(201).json({ data: order });
  } catch (error) {
    next(error);
  }
}

export async function handleListOrders(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const user = response.locals.user as AuthenticatedUser;
    const orders = await getAllOrdersForUser(user.id);
    response.json(orders.map(formatOrderSummary));
  } catch (error) {
    next(error);
  }
}

export async function handleListOrdersPaginated(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const user = response.locals.user as AuthenticatedUser;
    const { page, limit } = paginationQuerySchema.parse(request.query);
    const result = await getOrdersByUser(user.id, page, limit);
    response.json(result);
  } catch (error) {
    next(error);
  }
}

export async function handleCancelOrder(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const user = response.locals.user as AuthenticatedUser;
    const { id } = orderIdParamsSchema.parse(request.params);
    const order = await cancelOrder(id, user.id);
    response.json({ data: order });
  } catch (error) {
    next(error);
  }
}

export async function handleGetOrder(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const user = response.locals.user as AuthenticatedUser;
    const { id } = orderIdParamsSchema.parse(request.params);
    const order = await getOrderById(id, user.id);
    response.json(formatOrderDetail(order));
  } catch (error) {
    next(error);
  }
}
