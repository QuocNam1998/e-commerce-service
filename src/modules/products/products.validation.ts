import { z } from "zod";

export const productFilterQuerySchema = z.object({
  category: z.string().min(1).optional(),
  search: z.string().min(1).optional(),
});

export const productSlugParamsSchema = z.object({
  slug: z.string().min(1),
});

export const productIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const createProductSchema = z.object({
  id: z.string().min(1),
  sortOrder: z.number().int().nonnegative(),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  name: z.string().min(1).max(200),
  categorySlug: z.string().min(1).max(100),
  price: z.number().int().positive(),
  stock: z.number().int().nonnegative().default(0),
  description: z.string().min(1),
  image: z.string().min(1),
  highlights: z.array(z.string()).default([]),
  includes: z.array(z.string()).default([]),
});

export const updateProductSchema = z.object({
  sortOrder: z.number().int().nonnegative().optional(),
  name: z.string().min(1).max(200).optional(),
  categorySlug: z.string().min(1).max(100).optional(),
  price: z.number().int().positive().optional(),
  stock: z.number().int().nonnegative().optional(),
  description: z.string().min(1).optional(),
  image: z.string().min(1).optional(),
  highlights: z.array(z.string()).optional(),
  includes: z.array(z.string()).optional(),
}).refine((data) => Object.keys(data).length > 0, { message: "At least one field must be provided." });
