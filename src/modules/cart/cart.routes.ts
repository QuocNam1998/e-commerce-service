import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware.js";
import {
  handleAddItem,
  handleClearCart,
  handleGetCart,
  handleRemoveItem,
  handleUpdateItem,
} from "./cart.controller.js";

export const cartRouter = Router();

cartRouter.use(requireAuth);
cartRouter.get("/", handleGetCart);
cartRouter.post("/items", handleAddItem);
cartRouter.patch("/items/:productId", handleUpdateItem);
cartRouter.delete("/items/:productId", handleRemoveItem);
cartRouter.delete("/", handleClearCart);
