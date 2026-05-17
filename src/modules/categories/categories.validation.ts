import { z } from "zod";

export const createCategorySchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  name: z.string().min(1).max(100),
  sortOrder: z.number().int().nonnegative(),
});
