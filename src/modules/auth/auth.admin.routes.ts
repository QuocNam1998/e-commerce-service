import { Router } from "express";
import { requireAdmin } from "./auth.middleware.js";
import { handleAdminAssignRole } from "./auth.admin.controller.js";

export const adminUsersRouter = Router();

adminUsersRouter.use(requireAdmin);
adminUsersRouter.patch("/:id/role", handleAdminAssignRole);
