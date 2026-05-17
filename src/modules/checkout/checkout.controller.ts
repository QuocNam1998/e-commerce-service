import type { NextFunction, Request, Response } from "express";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { confirmPayment, initiateCheckout } from "./checkout.service.js";
import { checkoutOrderParamsSchema, initiateCheckoutSchema } from "./checkout.validation.js";

export async function handleInitiateCheckout(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const user = response.locals.user as AuthenticatedUser;
    const { savedAddressId, shippingAddress } = initiateCheckoutSchema.parse(request.body);
    const result = await initiateCheckout({ userId: user.id, savedAddressId, shippingAddress });
    response.status(201).json({ data: result });
  } catch (error) {
    next(error);
  }
}

export async function handleConfirmPayment(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const user = response.locals.user as AuthenticatedUser;
    const { orderId } = checkoutOrderParamsSchema.parse(request.params);
    const result = await confirmPayment({ orderId, userId: user.id });
    response.json({ data: result });
  } catch (error) {
    next(error);
  }
}
