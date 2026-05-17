import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware.js";
import { handleConfirmPayment, handleInitiateCheckout } from "./checkout.controller.js";

export const checkoutRouter = Router();

checkoutRouter.use(requireAuth);
checkoutRouter.post("/", handleInitiateCheckout);
checkoutRouter.post("/:orderId/pay", handleConfirmPayment);
