import { prisma } from "../../lib/db/prisma.js";
import type { AddressRecord, CreateAddressInput, UpdateAddressInput } from "./addresses.types.js";

type AddressRow = {
  id: string;
  userId: string;
  label: string | null;
  name: string;
  address: string;
  city: string;
  postal: string;
  country: string;
  isDefault: boolean;
  createdAt: Date;
};

function mapAddress(row: AddressRow): AddressRecord {
  return {
    id: row.id,
    userId: row.userId,
    label: row.label,
    name: row.name,
    address: row.address,
    city: row.city,
    postal: row.postal,
    country: row.country,
    isDefault: row.isDefault,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function findAddressesByUserId(userId: string): Promise<AddressRecord[]> {
  const rows = await prisma.shippingAddress.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });
  return rows.map(mapAddress);
}

export async function findAddressById(id: string): Promise<AddressRecord | null> {
  const row = await prisma.shippingAddress.findUnique({ where: { id } });
  return row ? mapAddress(row) : null;
}

export async function createAddress(input: CreateAddressInput): Promise<AddressRecord> {
  const existingCount = await prisma.shippingAddress.count({ where: { userId: input.userId } });
  const shouldBeDefault = input.isDefault === true || existingCount === 0;

  return prisma.$transaction(async (tx) => {
    if (shouldBeDefault) {
      await tx.shippingAddress.updateMany({
        where: { userId: input.userId, isDefault: true },
        data: { isDefault: false },
      });
    }
    const row = await tx.shippingAddress.create({
      data: {
        userId: input.userId,
        label: input.label ?? null,
        name: input.name,
        address: input.address,
        city: input.city,
        postal: input.postal,
        country: input.country,
        isDefault: shouldBeDefault,
      },
    });
    return mapAddress(row);
  });
}

export async function updateAddress(
  id: string,
  userId: string,
  data: UpdateAddressInput
): Promise<AddressRecord | null> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.shippingAddress.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) return null;

    if (data.isDefault) {
      await tx.shippingAddress.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const row = await tx.shippingAddress.update({
      where: { id },
      data: {
        ...(data.label !== undefined ? { label: data.label } : {}),
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.address !== undefined ? { address: data.address } : {}),
        ...(data.city !== undefined ? { city: data.city } : {}),
        ...(data.postal !== undefined ? { postal: data.postal } : {}),
        ...(data.country !== undefined ? { country: data.country } : {}),
        ...(data.isDefault !== undefined ? { isDefault: data.isDefault } : {}),
      },
    });
    return mapAddress(row);
  });
}

export async function deleteAddress(id: string, userId: string): Promise<boolean> {
  const result = await prisma.shippingAddress.deleteMany({ where: { id, userId } });
  return result.count > 0;
}
