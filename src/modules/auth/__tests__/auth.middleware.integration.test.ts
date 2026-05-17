import { createServer } from "node:http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../../../app.js";

// Mock Prisma so these tests run without a real database.
// The "no cookie" path never reaches the DB; the "invalid token" path calls
// findSessionByToken → we mock it to return null (no matching session).
vi.mock("../../auth/auth.session.repository.js", () => ({
  findSessionByToken: vi.fn().mockResolvedValue(null),
  deleteSessionByToken: vi.fn().mockResolvedValue(undefined),
  saveSession: vi.fn(),
  deleteSessionsByUserId: vi.fn(),
  createTokenHash: vi.fn((t: string) => t),
  savePasswordReset: vi.fn(),
  findPasswordResetByToken: vi.fn(),
  markPasswordResetUsed: vi.fn(),
  deletePasswordResetsByUserId: vi.fn(),
}));

let server: ReturnType<typeof createServer>;
let baseUrl: string;

beforeEach(async () => {
  const app = createApp();
  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const addr = server.address() as { port: number };
  baseUrl = `http://localhost:${addr.port}`;
});

afterEach(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((err) => (err ? reject(err) : resolve()))
  );
});

describe("requireAuth middleware — 401 for unauthenticated requests", () => {
  describe("GET /api/v1/cart", () => {
    it("returns 401 when no session cookie is provided", async () => {
      const res = await fetch(`${baseUrl}/api/v1/cart`);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body).toEqual({ message: "Authentication is required." });
    });

    it("returns 401 when session cookie contains an unrecognised token", async () => {
      const res = await fetch(`${baseUrl}/api/v1/cart`, {
        headers: { Cookie: "commerce_service_session=invalid-token" },
      });
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body).toEqual({ message: "Authentication is required." });
    });
  });

  it("GET /api/v1/orders — returns 401 when no session cookie", async () => {
    const res = await fetch(`${baseUrl}/api/v1/orders`);
    expect(res.status).toBe(401);
  });

  it("GET /api/v1/checkout — returns 401 when no session cookie", async () => {
    const res = await fetch(`${baseUrl}/api/v1/checkout`);
    expect(res.status).toBe(401);
  });

  it("GET /api/v1/addresses — returns 401 when no session cookie", async () => {
    const res = await fetch(`${baseUrl}/api/v1/addresses`);
    expect(res.status).toBe(401);
  });

  it("GET /api/v1/auth/me — returns 401 when no session cookie", async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/me`);
    expect(res.status).toBe(401);
  });
});
