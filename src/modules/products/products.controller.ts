import type { NextFunction, Request, Response } from "express";
import { paginationQuerySchema } from "../../lib/pagination.js";
import {
  createProduct,
  deleteProduct,
  getProductBySlug,
  listFeaturedProducts,
  listNewArrivalProducts,
  listProductsPaginated,
  listProductSlugs,
  updateProduct,
} from "./products.service.js";
import { createProductSchema, productFilterQuerySchema, productIdParamsSchema, productSlugParamsSchema, updateProductSchema } from "./products.validation.js";

export async function handleListProducts(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const { page, limit } = paginationQuerySchema.parse(request.query);
    const filter = productFilterQuerySchema.parse(request.query);
    const result = await listProductsPaginated(page, limit, filter);
    response.json(result);
  } catch (error) {
    next(error);
  }
}

export async function handleListFeaturedProducts(
  _request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const products = await listFeaturedProducts();

    response.json({
      data: products,
      meta: { count: products.length },
    });
  } catch (error) {
    next(error);
  }
}

export async function handleListNewArrivalProducts(
  _request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const products = await listNewArrivalProducts();

    response.json({
      data: products,
      meta: { count: products.length },
    });
  } catch (error) {
    next(error);
  }
}

export async function handleListProductSlugs(
  _request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const slugs = await listProductSlugs();

    response.json({
      data: slugs
    });
  } catch (error) {
    next(error);
  }
}

export async function handleGetProductBySlug(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const { slug } = productSlugParamsSchema.parse(request.params);
    const product = await getProductBySlug(slug);

    response.json({
      data: product
    });
  } catch (error) {
    next(error);
  }
}

export async function handleCreateProduct(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const input = createProductSchema.parse(request.body);
    const product = await createProduct(input);
    response.status(201).json({ data: product });
  } catch (error) {
    next(error);
  }
}

export async function handleUpdateProduct(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const { id } = productIdParamsSchema.parse(request.params);
    const input = updateProductSchema.parse(request.body);
    const product = await updateProduct(id, input);
    response.json({ data: product });
  } catch (error) {
    next(error);
  }
}

export async function handleDeleteProduct(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const { id } = productIdParamsSchema.parse(request.params);
    await deleteProduct(id);
    response.status(204).send();
  } catch (error) {
    next(error);
  }
}
