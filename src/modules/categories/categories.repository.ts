import { prisma } from "../../lib/db/prisma.js";
import type { CategoryRecord, CreateCategoryInput } from "./categories.types.js";

export async function listCategoryRecords(): Promise<CategoryRecord[]> {
  return prisma.category.findMany({ orderBy: { sortOrder: "asc" } });
}

export async function findCategoryBySlug(slug: string): Promise<CategoryRecord | null> {
  return prisma.category.findUnique({ where: { slug } });
}

export async function createCategoryRecord(input: CreateCategoryInput): Promise<CategoryRecord> {
  return prisma.category.create({ data: input });
}
