import type { NextFunction, Request, Response } from "express";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import {
  addItemToCart,
  emptyCart,
  getCart,
  removeItemFromCart,
  updateItemQuantity,
} from "./cart.service.js";
import {
  cartItemParamsSchema,
  updateCartItemSchema,
  upsertCartItemSchema,
} from "./cart.validation.js";

export async function handleGetCart(
  _request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const user = response.locals.user as AuthenticatedUser;
    const cart = await getCart(user.id);
    response.json({ data: cart });
  } catch (error) {
    next(error);
  }
}

export async function handleAddItem(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const user = response.locals.user as AuthenticatedUser;
    const { productId, quantity } = upsertCartItemSchema.parse(request.body);
    const cart = await addItemToCart(user.id, productId, quantity);
    response.json({ data: cart });
  } catch (error) {
    next(error);
  }
}

export async function handleUpdateItem(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const user = response.locals.user as AuthenticatedUser;
    const { productId } = cartItemParamsSchema.parse(request.params);
    const { quantity } = updateCartItemSchema.parse(request.body);
    const cart = await updateItemQuantity(user.id, productId, quantity);
    response.json({ data: cart });
  } catch (error) {
    next(error);
  }
}

export async function handleRemoveItem(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const user = response.locals.user as AuthenticatedUser;
    const { productId } = cartItemParamsSchema.parse(request.params);
    const cart = await removeItemFromCart(user.id, productId);
    response.json({ data: cart });
  } catch (error) {
    next(error);
  }
}

export async function handleClearCart(
  _request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const user = response.locals.user as AuthenticatedUser;
    await emptyCart(user.id);
    response.status(204).send();
  } catch (error) {
    next(error);
  }
}
