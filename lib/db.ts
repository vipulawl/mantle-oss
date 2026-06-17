import path from "path";
import { PrismaClient } from "@/app/generated/prisma/client";

// prisma migrate dev resolves `file:./dev.db` relative to the schema file (prisma/),
// creating prisma/dev.db. At runtime Next.js resolves it relative to CWD (project root),
// so it looks for ./dev.db — a different location. Force an absolute path to fix this.
const dbPath = path.resolve(process.cwd(), "prisma", "dev.db");
process.env.DATABASE_URL = `file:${dbPath}`;

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const db =
  globalForPrisma.prisma ||
  new PrismaClient({ log: ["error"] });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
