import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware.js";
import {
  handleCreateAddress,
  handleDeleteAddress,
  handleListAddresses,
  handleUpdateAddress,
} from "./addresses.controller.js";

export const addressesRouter = Router();

addressesRouter.use(requireAuth);
addressesRouter.get("/", handleListAddresses);
addressesRouter.post("/", handleCreateAddress);
addressesRouter.patch("/:id", handleUpdateAddress);
addressesRouter.delete("/:id", handleDeleteAddress);
