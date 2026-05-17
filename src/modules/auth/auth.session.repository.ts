import { createHash } from "node:crypto";
import { prisma } from "../../lib/db/prisma.js";
import { logger } from "../../lib/logger.js";
import type {
  AuthSessionRecord,
  PasswordResetTokenRecord,
} from "./auth.types.js";

export async function savePasswordReset({
  userId,
  tokenHash,
  expiresAt,
}: PasswordResetTokenRecord) {
  try {
    await prisma.passwordResets.create({
      data: {
        userId,
        tokenHash,
        expiresAt: new Date(expiresAt),
      },
    });
  } catch (error) {
    logger.error({ err: error }, "Error saving password reset token");
    throw new Error("Failed to save password reset token.");
  }
}

export async function saveSession(session: AuthSessionRecord) {
  await prisma.authSession.create({
    data: {
      tokenHash: session.tokenHash,
      userId: session.userId,
      expiresAt: new Date(session.expiresAt),
      createdAt: new Date(session.createdAt),
    },
  });

  return session;
}

export async function findSessionByToken(token: string) {
  const session = await prisma.authSession.findUnique({
    where: {
      tokenHash: hashToken(token),
    },
  });

  if (!session) {
    return null;
  }

  const record: AuthSessionRecord = {
    tokenHash: session.tokenHash,
    userId: session.userId,
    expiresAt: session.expiresAt.toISOString(),
    createdAt: session.createdAt.toISOString(),
  };

  return record;
}

export async function deleteSessionByToken(token: string) {
  await prisma.authSession.deleteMany({
    where: {
      tokenHash: hashToken(token),
    },
  });
}

export async function deleteSessionsByUserId(userId: string) {
  await prisma.authSession.deleteMany({
    where: { userId },
  });
}

export async function findPasswordResetByToken(tokenHash: string) {
  return prisma.passwordResets.findUnique({
    where: { tokenHash },
  });
}

export async function markPasswordResetUsed(id: string) {
  await prisma.passwordResets.update({
    where: { id },
    data: { usedAt: new Date() },
  });
}

export async function deletePasswordResetsByUserId(userId: string) {
  await prisma.passwordResets.deleteMany({
    where: { userId },
  });
}

export function createTokenHash(token: string) {
  return hashToken(token);
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
