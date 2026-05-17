import { z } from "zod";

export const createAddressSchema = z.object({
  label: z.string().min(1).max(50).optional(),
  name: z.string().min(1).max(100),
  address: z.string().min(1).max(200),
  city: z.string().min(1).max(100),
  postal: z.string().min(1).max(20),
  country: z.string().min(1).max(100),
  isDefault: z.boolean().optional(),
});

export const updateAddressSchema = createAddressSchema.partial();

export const addressParamsSchema = z.object({
  id: z.string().min(1),
});
