import "dotenv/config";
import { PrismaClient, UserRole } from "@prisma/client";
import { seedProducts } from "../src/data/seedProducts.js";
import { seedUsers } from "../src/data/seedUsers.js";

const prisma = new PrismaClient();

const seedCategories = [
  { slug: "lighting", name: "Lighting", sortOrder: 1 },
  { slug: "audio", name: "Audio", sortOrder: 2 },
  { slug: "workspace", name: "Workspace", sortOrder: 3 },
  { slug: "living", name: "Living", sortOrder: 4 },
  { slug: "kitchen", name: "Kitchen", sortOrder: 5 },
  { slug: "stationery", name: "Stationery", sortOrder: 6 },
];

async function seedCategoryTable() {
  for (const cat of seedCategories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, sortOrder: cat.sortOrder },
      create: cat,
    });
  }
}

async function seedProductTable() {
  const categories = await prisma.category.findMany();
  const catMap = new Map(categories.map((c) => [c.slug, c.id]));

  for (const product of seedProducts) {
    const { categorySlug, ...productData } = product;
    const categoryId = catMap.get(categorySlug);
    if (!categoryId) throw new Error(`Category "${categorySlug}" not found in seed data`);

    await prisma.product.upsert({
      where: { id: product.id },
      update: { ...productData, categoryId },
      create: { ...productData, categoryId },
    });
  }
}

async function seedUserTable() {
  for (const user of seedUsers) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        phone: user.phone,
        displayName: user.displayName,
        passwordHash: user.passwordHash,
        role: user.role as UserRole
      },
      create: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        displayName: user.displayName,
        passwordHash: user.passwordHash,
        role: user.role as UserRole
      }
    });
  }
}

async function main() {
  await seedCategoryTable();
  await seedProductTable();
  await seedUserTable();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
