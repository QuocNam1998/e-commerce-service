import { Router } from "express";
import { requireAdmin } from "../auth/auth.middleware.js";
import {
  handleAdminListOrders,
  handleAdminRefundOrder,
  handleAdminUpdateOrderStatus,
} from "./orders.admin.controller.js";

export const adminOrdersRouter = Router();

adminOrdersRouter.use(requireAdmin);
adminOrdersRouter.get("/", handleAdminListOrders);
adminOrdersRouter.patch("/:id/status", handleAdminUpdateOrderStatus);
adminOrdersRouter.post("/:id/refund", handleAdminRefundOrder);
