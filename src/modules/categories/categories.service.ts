import { HttpError } from "../../lib/httpError.js";
import {
  createCategoryRecord,
  findCategoryBySlug,
  listCategoryRecords,
} from "./categories.repository.js";
import type { CreateCategoryInput } from "./categories.types.js";

export async function listCategories() {
  return listCategoryRecords();
}

export async function createCategory(input: CreateCategoryInput) {
  const existing = await findCategoryBySlug(input.slug);
  if (existing) {
    throw new HttpError(409, `Category with slug "${input.slug}" already exists.`);
  }
  return createCategoryRecord(input);
}
