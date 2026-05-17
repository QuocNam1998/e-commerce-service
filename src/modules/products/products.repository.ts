import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/db/prisma.js";
import type { ProductFilterInput, ProductRecord } from "./products.types.js";

const productSelect = {
  id: true,
  sortOrder: true,
  slug: true,
  name: true,
  category: { select: { slug: true } },
  price: true,
  stock: true,
  description: true,
  image: true,
  highlights: true,
  includes: true,
} as const;

type ProductQueryResult = {
  id: string;
  sortOrder: number;
  slug: string;
  name: string;
  category: { slug: string };
  price: number;
  stock: number;
  description: string;
  image: string;
  highlights: string[];
  includes: string[];
};

function mapToProductRecord(p: ProductQueryResult): ProductRecord {
  return {
    id: p.id,
    sortOrder: p.sortOrder,
    slug: p.slug,
    name: p.name,
    category: p.category.slug,
    price: p.price,
    stock: p.stock,
    description: p.description,
    image: p.image,
    highlights: p.highlights,
    includes: p.includes,
  };
}

function buildFilterWhere(filter?: ProductFilterInput): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = { deletedAt: null };
  if (filter?.category) {
    where.category = { slug: { equals: filter.category, mode: "insensitive" } };
  }
  if (filter?.search) {
    where.OR = [
      { name: { contains: filter.search, mode: "insensitive" } },
      { description: { contains: filter.search, mode: "insensitive" } },
    ];
  }
  return where;
}

export async function listProductRecords(): Promise<ProductRecord[]> {
  const rows = await prisma.product.findMany({
    select: productSelect,
    where: { deletedAt: null },
    orderBy: { sortOrder: "asc" },
  });
  return rows.map(mapToProductRecord);
}

export async function listProductRecordsPaginated(
  page: number,
  limit: number,
  filter?: ProductFilterInput
): Promise<{ products: ProductRecord[]; total: number }> {
  const skip = (page - 1) * limit;
  const where = buildFilterWhere(filter);
  const [rows, total] = await Promise.all([
    prisma.product.findMany({
      select: productSelect,
      where,
      orderBy: { sortOrder: "asc" },
      skip,
      take: limit,
    }),
    prisma.product.count({ where }),
  ]);
  return { products: rows.map(mapToProductRecord), total };
}

export async function listFeaturedProductRecords(): Promise<ProductRecord[]> {
  const rows = await prisma.product.findMany({
    select: productSelect,
    where: { deletedAt: null },
    orderBy: { sortOrder: "asc" },
    take: 3,
  });
  return rows.map(mapToProductRecord);
}

export async function listNewArrivalProductRecords(): Promise<ProductRecord[]> {
  const rows = await prisma.product.findMany({
    select: productSelect,
    where: { deletedAt: null },
    orderBy: { sortOrder: "asc" },
    skip: 3,
  });
  return rows.map(mapToProductRecord);
}

export async function listProductSlugRecords(): Promise<string[]> {
  const records = await prisma.product.findMany({
    select: { slug: true },
    where: { deletedAt: null },
    orderBy: { sortOrder: "asc" },
  });
  return records.map((r) => r.slug);
}

export async function findProductRecordsByIds(ids: string[]): Promise<ProductRecord[]> {
  const rows = await prisma.product.findMany({
    select: productSelect,
    where: { id: { in: ids }, deletedAt: null },
  });
  return rows.map(mapToProductRecord);
}

export async function findProductRecordBySlug(slug: string): Promise<ProductRecord | null> {
  const row = await prisma.product.findFirst({
    select: productSelect,
    where: { slug, deletedAt: null },
  });
  return row ? mapToProductRecord(row) : null;
}

export async function findProductRecordById(id: string): Promise<ProductRecord | null> {
  const row = await prisma.product.findFirst({
    select: productSelect,
    where: { id, deletedAt: null },
  });
  return row ? mapToProductRecord(row) : null;
}

type CreateProductData = {
  id: string;
  sortOrder: number;
  slug: string;
  name: string;
  categoryId: string;
  price: number;
  stock: number;
  description: string;
  image: string;
  highlights: string[];
  includes: string[];
};

export async function createProductRecord(data: CreateProductData): Promise<ProductRecord> {
  const row = await prisma.product.create({
    select: productSelect,
    data,
  });
  return mapToProductRecord(row);
}

type UpdateProductData = {
  sortOrder?: number;
  name?: string;
  categoryId?: string;
  price?: number;
  stock?: number;
  description?: string;
  image?: string;
  highlights?: string[];
  includes?: string[];
};

export async function updateProductRecord(
  id: string,
  data: UpdateProductData
): Promise<ProductRecord | null> {
  try {
    const row = await prisma.product.update({
      select: productSelect,
      where: { id, deletedAt: null },
      data,
    });
    return mapToProductRecord(row);
  } catch (e: unknown) {
    const prismaError = e as { code?: string };
    if (prismaError.code === "P2025") return null;
    throw e;
  }
}

export async function deleteProductRecord(id: string): Promise<boolean> {
  try {
    await prisma.product.update({
      where: { id, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    return true;
  } catch (e: unknown) {
    const prismaError = e as { code?: string };
    if (prismaError.code === "P2025") return false;
    throw e;
  }
}

export async function decrementProductStocks(
  items: Array<{ productId: string; quantity: number }>,
  tx: Prisma.TransactionClient = prisma
): Promise<void> {
  for (const item of items) {
    const result = await tx.product.updateMany({
      where: { id: item.productId, stock: { gte: item.quantity } },
      data: { stock: { decrement: item.quantity } },
    });
    if (result.count === 0) {
      throw new Error(`INSUFFICIENT_STOCK:${item.productId}`);
    }
  }
}

export async function incrementProductStocks(
  items: Array<{ productId: string; quantity: number }>,
  tx: Prisma.TransactionClient = prisma
): Promise<void> {
  for (const item of items) {
    await tx.product.update({
      where: { id: item.productId },
      data: { stock: { increment: item.quantity } },
    });
  }
}
