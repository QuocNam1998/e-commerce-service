import type { NextFunction, Request, Response } from "express";
import { createCategory, listCategories } from "./categories.service.js";
import { createCategorySchema } from "./categories.validation.js";

export async function handleListCategories(
  _request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const categories = await listCategories();
    response.json({ data: categories });
  } catch (error) {
    next(error);
  }
}

export async function handleCreateCategory(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const input = createCategorySchema.parse(request.body);
    const category = await createCategory(input);
    response.status(201).json({ data: category });
  } catch (error) {
    next(error);
  }
}
