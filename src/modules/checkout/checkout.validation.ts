import { z } from "zod";

const shippingAddressSchema = z.object({
  name: z.string().min(1),
  address: z.string().min(1),
  city: z.string().min(1),
  postal: z.string().min(1),
  country: z.string().min(1),
});

export const initiateCheckoutSchema = z
  .object({
    savedAddressId: z.string().min(1).optional(),
    shippingAddress: shippingAddressSchema.optional(),
  })
  .refine((data) => !!data.savedAddressId || !!data.shippingAddress, {
    message: "Either savedAddressId or shippingAddress is required.",
  });

export const checkoutOrderParamsSchema = z.object({
  orderId: z.string().min(1),
});
