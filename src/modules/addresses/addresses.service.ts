import { HttpError } from "../../lib/httpError.js";
import {
  createAddress,
  deleteAddress,
  findAddressesByUserId,
  updateAddress,
} from "./addresses.repository.js";
import type { CreateAddressInput, UpdateAddressInput } from "./addresses.types.js";

export async function listAddresses(userId: string) {
  return findAddressesByUserId(userId);
}

export async function addAddress(
  userId: string,
  data: Omit<CreateAddressInput, "userId">
) {
  return createAddress({ ...data, userId });
}

export async function editAddress(
  userId: string,
  addressId: string,
  data: UpdateAddressInput
) {
  const result = await updateAddress(addressId, userId, data);
  if (!result) {
    throw new HttpError(404, "Address not found.");
  }
  return result;
}

export async function removeAddress(userId: string, addressId: string): Promise<void> {
  const deleted = await deleteAddress(addressId, userId);
  if (!deleted) {
    throw new HttpError(404, "Address not found.");
  }
}
