import { randomBytes } from "node:crypto";
import { HttpError } from "../../lib/httpError.js";
import { hashPassword, verifyPassword } from "../../lib/password.js";
import { AUTH_SESSION_TTL_MS } from "./auth.constants.js";
import {
  createTokenHash,
  deletePasswordResetsByUserId,
  deleteSessionByToken,
  deleteSessionsByUserId,
  findPasswordResetByToken,
  findSessionByToken,
  markPasswordResetUsed,
  saveSession,
} from "./auth.session.repository.js";
import {
  anonymizeUser,
  createUser,
  findUserByEmail,
  findUserById,
  findUserByIdentifier,
  findUserByPhone,
  updateUserPassword,
  updateUserProfile,
  updateUserRole,
} from "./auth.repository.js";
import type {
  AuthenticatedUser,
  LoginInput,
  LoginResult,
  RegisterInput
} from "./auth.types.js";

export async function loginUser(input: LoginInput): Promise<LoginResult> {
  const user = await findUserByIdentifier(input.identifier);

  if (!user) {
    throw new HttpError(401, "Invalid credentials.");
  }

  const isPasswordValid = await verifyPassword(input.password, user.passwordHash);

  if (!isPasswordValid) {
    throw new HttpError(401, "Invalid credentials.");
  }

  const sessionToken = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + AUTH_SESSION_TTL_MS).toISOString();

  await saveSession({
    tokenHash: createTokenHash(sessionToken),
    userId: user.id,
    expiresAt,
    createdAt: new Date().toISOString()
  });

  return {
    sessionToken,
    expiresAt,
    user: sanitizeUser(user)
  };
}

export async function getAuthenticatedUser(sessionToken: string): Promise<AuthenticatedUser> {
  const session = await findSessionByToken(sessionToken);

  if (!session) {
    throw new HttpError(401, "Authentication is required.");
  }

  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    await deleteSessionByToken(sessionToken);
    throw new HttpError(401, "Session has expired.");
  }

  const user = await findUserById(session.userId);

  if (!user) {
    await deleteSessionByToken(sessionToken);
    throw new HttpError(401, "Authentication is required.");
  }

  return sanitizeUser(user);
}

export async function logoutUser(sessionToken: string) {
  await deleteSessionByToken(sessionToken);
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const tokenHash = createTokenHash(token);
  const record = await findPasswordResetByToken(tokenHash);

  if (!record || record.usedAt) {
    throw new HttpError(400, "Invalid or expired password reset token.");
  }

  if (new Date(record.expiresAt).getTime() <= Date.now()) {
    throw new HttpError(400, "Invalid or expired password reset token.");
  }

  const passwordHash = await hashPassword(newPassword);
  await updateUserPassword(record.userId, passwordHash);
  await markPasswordResetUsed(record.id);
  await deleteSessionsByUserId(record.userId);
}

export async function registerUser(input: RegisterInput): Promise<LoginResult> {
  const email = input.email.trim().toLowerCase();
  const phone = input.phone?.replace(/\D/g, "") ?? "";

  const [existingEmailUser, existingPhoneUser] = await Promise.all([
    findUserByEmail(email),
    phone ? findUserByPhone(phone) : Promise.resolve(null)
  ]);

  if (existingEmailUser) {
    throw new HttpError(409, "This email is already registered.");
  }

  if (existingPhoneUser) {
    throw new HttpError(409, "This phone number is already registered.");
  }

  const passwordHash = await hashPassword(input.password);
  const user = await createUser({
    email,
    phone: phone || null,
    displayName: input.displayName,
    passwordHash
  });

  const sessionToken = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + AUTH_SESSION_TTL_MS).toISOString();

  await saveSession({
    tokenHash: createTokenHash(sessionToken),
    userId: user.id,
    expiresAt,
    createdAt: new Date().toISOString()
  });

  return {
    sessionToken,
    expiresAt,
    user: sanitizeUser(user)
  };
}

export async function updateProfile(
  userId: string,
  data: { displayName?: string; phone?: string | null }
): Promise<AuthenticatedUser> {
  const user = await updateUserProfile(userId, data);
  return sanitizeUser(user);
}

export async function deleteAccount(userId: string): Promise<void> {
  await deletePasswordResetsByUserId(userId);
  await deleteSessionsByUserId(userId);
  await anonymizeUser(userId);
}

export async function adminAssignRole(
  userId: string,
  role: "customer" | "admin"
): Promise<AuthenticatedUser> {
  const user = await findUserById(userId);
  if (!user) {
    throw new HttpError(404, `User "${userId}" was not found.`);
  }
  const updated = await updateUserRole(userId, role === "admin" ? "ADMIN" : "CUSTOMER");
  return sanitizeUser(updated);
}

function sanitizeUser(user: {
  id: string;
  email: string;
  phone: string | null;
  displayName: string;
  role: "customer" | "admin";
  createdAt: string;
}): AuthenticatedUser {
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    displayName: user.displayName,
    role: user.role,
    createdAt: user.createdAt
  };
}
