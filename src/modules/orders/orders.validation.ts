import { z } from "zod";

export const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().positive().max(99),
      })
    )
    .min(1, "Order must contain at least one item."),
  shippingAddress: z.object({
    name: z.string().trim().min(2).max(100),
    address: z.string().trim().min(5).max(200),
    city: z.string().trim().min(2).max(100),
    postal: z.string().trim().min(2).max(20),
    country: z.string().trim().min(2).max(100),
  }),
});

export const orderIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const adminListOrdersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const adminUpdateOrderStatusSchema = z.object({
  status: z.enum(["confirmed", "shipped", "delivered"]),
});
