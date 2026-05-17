import { Router } from "express";
import { requireAdmin } from "../auth/auth.middleware.js";
import { handleCreateCategory, handleListCategories } from "./categories.controller.js";

export const categoriesRouter = Router();

categoriesRouter.get("/", handleListCategories);
categoriesRouter.post("/", requireAdmin, handleCreateCategory);
