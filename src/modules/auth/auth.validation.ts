import { z } from "zod";
import { HttpError } from "../../lib/httpError.js";
import { parseCookies } from "../../lib/cookies.js";

export const loginSchema = z.object({
  identifier: z.string().trim().min(3).max(160),
  password: z.string().min(6).max(128),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email().max(160),
});

export const resetPasswordSchema = z.object({
  token: z.string().trim(),
  newPassword: z.string().min(6).max(128),
});

export const registerSchema = z.object({
  email: z.string().trim().email().max(160),
  password: z.string().min(6).max(128),
  displayName: z.string().trim().min(2).max(80),
  phone: z
    .string()
    .trim()
    .max(20)
    .optional()
    .transform((value) => value ?? ""),
});

export const updateProfileSchema = z
  .object({
    displayName: z.string().trim().min(2).max(80).optional(),
    phone: z.string().trim().max(20).nullable().optional(),
  })
  .refine((data) => data.displayName !== undefined || data.phone !== undefined, {
    message: "At least one field must be provided.",
  });

export const userIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const assignRoleSchema = z.object({
  role: z.enum(["customer", "admin"]),
});

export function parseSessionCookie(
  cookieHeader: string | undefined,
  cookieName: string,
) {
  const cookies = parseCookies(cookieHeader);
  const sessionToken = cookies[cookieName];

  if (!sessionToken) {
    throw new HttpError(401, "Authentication is required.");
  }

  return sessionToken;
}
