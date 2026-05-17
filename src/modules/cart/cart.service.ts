import { HttpError } from "../../lib/httpError.js";
import { findProductRecordsByIds } from "../products/products.repository.js";
import {
  clearCart,
  findOrCreateCart,
  removeCartItem,
  updateCartItemQuantity,
  upsertCartItem,
} from "./cart.repository.js";

export async function getCart(userId: string) {
  return findOrCreateCart(userId);
}

export async function addItemToCart(userId: string, productId: string, quantity: number) {
  const [product] = await findProductRecordsByIds([productId]);
  if (!product) {
    throw new HttpError(404, `Product "${productId}" was not found.`);
  }

  return upsertCartItem(userId, productId, quantity);
}

export async function updateItemQuantity(userId: string, productId: string, quantity: number) {
  const cart = await updateCartItemQuantity(userId, productId, quantity);
  if (!cart) {
    throw new HttpError(404, "Cart item not found.");
  }
  return cart;
}

export async function removeItemFromCart(userId: string, productId: string) {
  const cart = await removeCartItem(userId, productId);
  if (!cart) {
    throw new HttpError(404, "Cart item not found.");
  }
  return cart;
}

export async function emptyCart(userId: string) {
  await clearCart(userId);
}
