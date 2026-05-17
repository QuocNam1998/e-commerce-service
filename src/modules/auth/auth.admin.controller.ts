import type { NextFunction, Request, Response } from "express";
import { adminAssignRole } from "./auth.service.js";
import { assignRoleSchema, userIdParamsSchema } from "./auth.validation.js";

export async function handleAdminAssignRole(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  try {
    const { id } = userIdParamsSchema.parse(request.params);
    const { role } = assignRoleSchema.parse(request.body);
    const user = await adminAssignRole(id, role);
    response.json({ data: user });
  } catch (error) {
    next(error);
  }
}
