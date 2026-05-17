import type { NextFunction, Request, Response } from "express";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { addAddress, editAddress, listAddresses, removeAddress } from "./addresses.service.js";
import { addressParamsSchema, createAddressSchema, updateAddressSchema } from "./addresses.validation.js";

export async function handleListAddresses(req: Request, res: Response, next: NextFunction) {
  try {
    const user = res.locals.user as AuthenticatedUser;
    const addresses = await listAddresses(user.id);
    res.json({ data: addresses });
  } catch (error) {
    next(error);
  }
}

export async function handleCreateAddress(req: Request, res: Response, next: NextFunction) {
  try {
    const user = res.locals.user as AuthenticatedUser;
    const data = createAddressSchema.parse(req.body);
    const address = await addAddress(user.id, data);
    res.status(201).json({ data: address });
  } catch (error) {
    next(error);
  }
}

export async function handleUpdateAddress(req: Request, res: Response, next: NextFunction) {
  try {
    const user = res.locals.user as AuthenticatedUser;
    const { id } = addressParamsSchema.parse(req.params);
    const data = updateAddressSchema.parse(req.body);
    const address = await editAddress(user.id, id, data);
    res.json({ data: address });
  } catch (error) {
    next(error);
  }
}

export async function handleDeleteAddress(req: Request, res: Response, next: NextFunction) {
  try {
    const user = res.locals.user as AuthenticatedUser;
    const { id } = addressParamsSchema.parse(req.params);
    await removeAddress(user.id, id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
