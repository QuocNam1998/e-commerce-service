import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware.js";
import {
  handleCancelOrder,
  handleCreateOrder,
  handleGetOrder,
  handleListOrders,
} from "./orders.controller.js";

export const ordersRouter = Router();

ordersRouter.use(requireAuth);
ordersRouter.post("/", handleCreateOrder);
ordersRouter.get("/", handleListOrders);
ordersRouter.get("/:id", handleGetOrder);
ordersRouter.post("/:id/cancel", handleCancelOrder);
