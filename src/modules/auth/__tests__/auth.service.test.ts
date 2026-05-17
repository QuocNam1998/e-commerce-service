import { beforeEach, describe, expect, it, vi } from "vitest";
import { HttpError } from "../../../lib/httpError.js";

vi.mock("../auth.session.repository.js", () => ({
  createTokenHash: vi.fn((token: string) => `hashed_${token}`),
  findPasswordResetByToken: vi.fn(),
  markPasswordResetUsed: vi.fn(),
  deleteSessionsByUserId: vi.fn(),
  deleteSessionByToken: vi.fn(),
  findSessionByToken: vi.fn(),
  saveSession: vi.fn(),
}));

vi.mock("../auth.repository.js", () => ({
  findUserByIdentifier: vi.fn(),
  findUserById: vi.fn(),
  findUserByEmail: vi.fn(),
  findUserByPhone: vi.fn(),
  createUser: vi.fn(),
  updateUserPassword: vi.fn(),
  updateUserProfile: vi.fn(),
  anonymizeUser: vi.fn(),
  updateUserRole: vi.fn(),
}));

vi.mock("../../../lib/password.js", () => ({
  hashPassword: vi.fn().mockResolvedValue("hashed_password"),
  verifyPassword: vi.fn(),
}));

import {
  findPasswordResetByToken,
  markPasswordResetUsed,
  deleteSessionsByUserId,
  deleteSessionByToken,
  findSessionByToken,
} from "../auth.session.repository.js";
import { findUserById, updateUserPassword } from "../auth.repository.js";
import { getAuthenticatedUser, resetPassword } from "../auth.service.js";

const MOCK_USER = {
  id: "user-1",
  email: "alice@example.com",
  phone: null,
  displayName: "Alice",
  passwordHash: "hashed",
  role: "customer" as const,
  createdAt: "2024-01-01T00:00:00.000Z",
};

const MOCK_SESSION = {
  tokenHash: "hashed_tok",
  userId: "user-1",
  expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
  createdAt: new Date().toISOString(),
};

describe("resetPassword", () => {
  const RESET_RECORD = {
    id: "reset-1",
    userId: "user-1",
    tokenHash: "hashed_good-token",
    expiresAt: new Date(Date.now() + 3_600_000),
    usedAt: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(findPasswordResetByToken).mockResolvedValue(RESET_RECORD as any);
    vi.mocked(updateUserPassword).mockResolvedValue(undefined as any);
    vi.mocked(markPasswordResetUsed).mockResolvedValue(undefined as any);
    vi.mocked(deleteSessionsByUserId).mockResolvedValue(undefined as any);
  });

  it("throws 400 when the token does not exist", async () => {
    vi.mocked(findPasswordResetByToken).mockResolvedValue(null);
    await expect(resetPassword("bad-token", "NewPass1!")).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("throws 400 when the token has already been used", async () => {
    vi.mocked(findPasswordResetByToken).mockResolvedValue({
      ...RESET_RECORD,
      usedAt: new Date(),
    } as any);
    await expect(resetPassword("good-token", "NewPass1!")).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("throws 400 when the token is expired", async () => {
    vi.mocked(findPasswordResetByToken).mockResolvedValue({
      ...RESET_RECORD,
      expiresAt: new Date(Date.now() - 1000),
    } as any);
    await expect(resetPassword("good-token", "NewPass1!")).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("updates the password, marks the token used, and invalidates all sessions", async () => {
    await resetPassword("good-token", "NewPass1!");

    expect(updateUserPassword).toHaveBeenCalledWith("user-1", "hashed_password");
    expect(markPasswordResetUsed).toHaveBeenCalledWith("reset-1");
    expect(deleteSessionsByUserId).toHaveBeenCalledWith("user-1");
  });
});

describe("getAuthenticatedUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(findSessionByToken).mockResolvedValue(MOCK_SESSION);
    vi.mocked(findUserById).mockResolvedValue(MOCK_USER as any);
    vi.mocked(deleteSessionByToken).mockResolvedValue(undefined as any);
  });

  it("throws 401 when the session does not exist", async () => {
    vi.mocked(findSessionByToken).mockResolvedValue(null);
    await expect(getAuthenticatedUser("no-session")).rejects.toMatchObject({ statusCode: 401 });
  });

  it("throws 401 and deletes the session when it is expired", async () => {
    vi.mocked(findSessionByToken).mockResolvedValue({
      ...MOCK_SESSION,
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    });

    await expect(getAuthenticatedUser("expired-tok")).rejects.toMatchObject({ statusCode: 401 });
    expect(deleteSessionByToken).toHaveBeenCalledWith("expired-tok");
  });

  it("throws 401 and deletes the session when the user no longer exists", async () => {
    vi.mocked(findUserById).mockResolvedValue(null);

    await expect(getAuthenticatedUser("orphan-tok")).rejects.toMatchObject({ statusCode: 401 });
    expect(deleteSessionByToken).toHaveBeenCalledWith("orphan-tok");
  });

  it("returns a sanitized user (no passwordHash) for a valid session", async () => {
    const user = await getAuthenticatedUser("valid-tok");

    expect(user.id).toBe("user-1");
    expect(user.email).toBe("alice@example.com");
    expect((user as any).passwordHash).toBeUndefined();
  });
});
