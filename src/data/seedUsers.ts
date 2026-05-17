import { hashPasswordSync } from "../lib/password.js";

export const seedUsers = [
  {
    id: "user-demo-1",
    email: "shopper@modern-market.dev",
    phone: "0327130264",
    displayName: "Modern Market Shopper",
    passwordHash: hashPasswordSync("Shopper@123"),
    role: "CUSTOMER"
  },
  {
    id: "user-admin-1",
    email: "admin@modern-market.dev",
    phone: "0988000001",
    displayName: "Modern Market Admin",
    passwordHash: hashPasswordSync("Admin@123"),
    role: "ADMIN"
  }
];
