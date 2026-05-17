import { buildPaginationMeta } from "../../lib/pagination.js";
import { HttpError } from "../../lib/httpError.js";
import { findCategoryBySlug } from "../categories/categories.repository.js";
import {
  createProductRecord,
  deleteProductRecord,
  findProductRecordBySlug,
  listFeaturedProductRecords,
  listNewArrivalProductRecords,
  listProductRecords,
  listProductRecordsPaginated,
  listProductSlugRecords,
  updateProductRecord,
} from "./products.repository.js";
import type { CreateProductInput, ProductFilterInput, UpdateProductInput } from "./products.types.js";

export async function listProducts() {
  return listProductRecords();
}

export async function listProductsPaginated(page: number, limit: number, filter?: ProductFilterInput) {
  const { products, total } = await listProductRecordsPaginated(page, limit, filter);
  return {
    data: products,
    meta: buildPaginationMeta(total, page, limit),
  };
}

export async function listFeaturedProducts() {
  return listFeaturedProductRecords();
}

export async function listNewArrivalProducts() {
  return listNewArrivalProductRecords();
}

export async function getProductBySlug(slug: string) {
  const product = await findProductRecordBySlug(slug);

  if (!product) {
    throw new HttpError(404, `Product with slug "${slug}" was not found.`);
  }

  return product;
}

export async function listProductSlugs() {
  return listProductSlugRecords();
}

async function resolveCategoryId(categorySlug: string): Promise<string> {
  const category = await findCategoryBySlug(categorySlug);
  if (!category) {
    throw new HttpError(400, `Category "${categorySlug}" was not found.`);
  }
  return category.id;
}

export async function createProduct(input: CreateProductInput) {
  const categoryId = await resolveCategoryId(input.categorySlug);
  const { categorySlug: _, ...rest } = input;
  return createProductRecord({ ...rest, categoryId });
}

export async function updateProduct(id: string, input: UpdateProductInput) {
  let categoryId: string | undefined;
  if (input.categorySlug !== undefined) {
    categoryId = await resolveCategoryId(input.categorySlug);
  }
  const { categorySlug: _, ...rest } = input;
  const product = await updateProductRecord(id, { ...rest, ...(categoryId ? { categoryId } : {}) });

  if (!product) {
    throw new HttpError(404, `Product "${id}" was not found.`);
  }

  return product;
}

export async function deleteProduct(id: string) {
  const deleted = await deleteProductRecord(id);

  if (!deleted) {
    throw new HttpError(404, `Product "${id}" was not found.`);
  }
}
