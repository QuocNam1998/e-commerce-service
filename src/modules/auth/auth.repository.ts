import { prisma } from "../../lib/db/prisma.js";
import type { AuthUserRecord } from "./auth.types.js";

export async function findUserByIdentifier(identifier: string) {
  const normalizedEmail = identifier.toLowerCase().trim();
  const normalizedPhone = identifier.replace(/\D/g, "");
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        {
          email: normalizedEmail
        },
        normalizedPhone
          ? {
              phone: normalizedPhone
            }
          : undefined
      ].filter(Boolean) as Array<{ email?: string; phone?: string }>
    }
  });

  return user ? mapUserRecord(user) : null;
}

export async function findUserById(userId: string) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId
    }
  });

  return user ? mapUserRecord(user) : null;
}

export async function findUserByEmail(email: string) {
  const user = await prisma.user.findUnique({
    where: {
      email: email.trim().toLowerCase()
    }
  });

  return user ? mapUserRecord(user) : null;
}

export async function findUserByPhone(phone: string) {
  const normalizedPhone = phone.replace(/\D/g, "");

  if (!normalizedPhone) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: {
      phone: normalizedPhone
    }
  });

  return user ? mapUserRecord(user) : null;
}

export async function createUser(input: {
  email: string;
  phone?: string | null;
  displayName: string;
  passwordHash: string;
}) {
  const user = await prisma.user.create({
    data: {
      email: input.email.trim().toLowerCase(),
      phone: input.phone ? input.phone.replace(/\D/g, "") : null,
      displayName: input.displayName.trim(),
      passwordHash: input.passwordHash,
      role: "CUSTOMER"
    }
  });

  return mapUserRecord(user);
}

export async function updateUserPassword(userId: string, passwordHash: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });
}

export async function updateUserProfile(
  userId: string,
  data: { displayName?: string; phone?: string | null }
) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.displayName !== undefined && { displayName: data.displayName.trim() }),
      ...(data.phone !== undefined && {
        phone: data.phone ? data.phone.replace(/\D/g, "") || null : null,
      }),
    },
  });
  return mapUserRecord(user);
}

export async function anonymizeUser(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      email: `deleted_${userId}@deleted.invalid`,
      displayName: "Deleted User",
      phone: null,
      passwordHash: "deleted",
    },
  });
}

export async function updateUserRole(userId: string, role: "CUSTOMER" | "ADMIN") {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { role },
  });
  return mapUserRecord(user);
}

function mapUserRecord(user: {
  id: string;
  email: string;
  phone: string | null;
  displayName: string;
  passwordHash: string;
  role: string;
  createdAt: Date;
}) {
  const record: AuthUserRecord = {
    id: user.id,
    email: user.email,
    phone: user.phone,
    displayName: user.displayName,
    passwordHash: user.passwordHash,
    role: user.role === "ADMIN" ? "admin" : "customer",
    createdAt: user.createdAt.toISOString()
  };

  return record;
}
