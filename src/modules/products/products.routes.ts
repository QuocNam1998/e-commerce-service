import { Router } from "express";
import { requireAdmin } from "../auth/auth.middleware.js";
import {
  handleCreateProduct,
  handleDeleteProduct,
  handleGetProductBySlug,
  handleListFeaturedProducts,
  handleListNewArrivalProducts,
  handleListProducts,
  handleListProductSlugs,
  handleUpdateProduct,
} from "./products.controller.js";

export const productsRouter = Router();

productsRouter.get("/", handleListProducts);
productsRouter.get("/featured", handleListFeaturedProducts);
productsRouter.get("/new-arrivals", handleListNewArrivalProducts);
productsRouter.get("/slugs", handleListProductSlugs);
productsRouter.post("/", requireAdmin, handleCreateProduct);
productsRouter.patch("/:id", requireAdmin, handleUpdateProduct);
productsRouter.delete("/:id", requireAdmin, handleDeleteProduct);
productsRouter.get("/:slug", handleGetProductBySlug);
