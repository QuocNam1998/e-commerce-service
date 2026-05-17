import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../lib/db/prisma.js", () => ({
  prisma: {
    product: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

import { prisma } from "../../../lib/db/prisma.js";
import {
  deleteProductRecord,
  findProductRecordById,
  findProductRecordBySlug,
  listProductRecords,
  decrementProductStocks,
} from "../products.repository.js";

const MOCK_ROW = {
  id: "prod-1",
  sortOrder: 1,
  slug: "widget",
  name: "Widget",
  category: { slug: "electronics" },
  price: 1000,
  stock: 10,
  description: "A widget",
  image: "img.jpg",
  highlights: [] as string[],
  includes: [] as string[],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("findProductRecordBySlug", () => {
  it("queries with deletedAt: null and returns mapped record", async () => {
    vi.mocked(prisma.product.findFirst).mockResolvedValue(MOCK_ROW as any);

    const result = await findProductRecordBySlug("widget");

    expect(prisma.product.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ slug: "widget", deletedAt: null }),
      })
    );
    expect(result?.slug).toBe("widget");
    expect(result?.category).toBe("electronics");
  });

  it("returns null when the product does not exist", async () => {
    vi.mocked(prisma.product.findFirst).mockResolvedValue(null);

    const result = await findProductRecordBySlug("missing");

    expect(result).toBeNull();
  });
});

describe("findProductRecordById", () => {
  it("queries with deletedAt: null", async () => {
    vi.mocked(prisma.product.findFirst).mockResolvedValue(MOCK_ROW as any);

    await findProductRecordById("prod-1");

    expect(prisma.product.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "prod-1", deletedAt: null }),
      })
    );
  });
});

describe("listProductRecords", () => {
  it("queries with deletedAt: null", async () => {
    vi.mocked(prisma.product.findMany).mockResolvedValue([MOCK_ROW] as any);

    const results = await listProductRecords();

    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ deletedAt: null }),
      })
    );
    expect(results).toHaveLength(1);
  });
});

describe("deleteProductRecord", () => {
  it("soft-deletes by setting deletedAt instead of hard-deleting", async () => {
    vi.mocked(prisma.product.update).mockResolvedValue({ id: "prod-1" } as any);

    const result = await deleteProductRecord("prod-1");

    expect(prisma.product.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "prod-1", deletedAt: null },
        data: expect.objectContaining({ deletedAt: expect.any(Date) }),
      })
    );
    expect(result).toBe(true);
  });

  it("returns false for a product that does not exist", async () => {
    const err = Object.assign(new Error("Not found"), { code: "P2025" });
    vi.mocked(prisma.product.update).mockRejectedValue(err);

    const result = await deleteProductRecord("nonexistent");

    expect(result).toBe(false);
  });
});

describe("decrementProductStocks", () => {
  it("throws INSUFFICIENT_STOCK error when updateMany returns count 0", async () => {
    vi.mocked(prisma.product.updateMany).mockResolvedValue({ count: 0 } as any);

    await expect(
      decrementProductStocks([{ productId: "prod-1", quantity: 5 }])
    ).rejects.toThrow("INSUFFICIENT_STOCK:prod-1");
  });

  it("succeeds when all items have sufficient stock", async () => {
    vi.mocked(prisma.product.updateMany).mockResolvedValue({ count: 1 } as any);

    await expect(
      decrementProductStocks([{ productId: "prod-1", quantity: 2 }])
    ).resolves.toBeUndefined();
  });
});
