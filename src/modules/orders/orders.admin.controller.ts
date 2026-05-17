import type { NextFunction, Request, Response } from "express";
import { adminRefundOrder } from "../checkout/checkout.service.js";
import { adminListOrders, adminUpdateOrderStatus } from "./orders.service.js";
import { adminListOrdersQuerySchema, adminUpdateOrderStatusSchema, orderIdParamsSchema } from "./orders.validation.js";

export async function handleAdminListOrders(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const { page, limit } = adminListOrdersQuerySchema.parse(request.query);
    const result = await adminListOrders(page, limit);
    response.json(result);
  } catch (error) {
    next(error);
  }
}

export async function handleAdminUpdateOrderStatus(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const { id } = orderIdParamsSchema.parse(request.params);
    const { status } = adminUpdateOrderStatusSchema.parse(request.body);
    const order = await adminUpdateOrderStatus(id, status);
    response.json({ data: order });
  } catch (error) {
    next(error);
  }
}

export async function handleAdminRefundOrder(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const { id } = orderIdParamsSchema.parse(request.params);
    const result = await adminRefundOrder(id);
    response.json({ data: result });
  } catch (error) {
    next(error);
  }
}
