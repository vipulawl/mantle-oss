/*
  Warnings:

  - The primary key for the `Install` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `Install` table. All the data in the column will be lost.
  - You are about to drop the column `plan` on the `Transaction` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Install" (
    "shopDomain" TEXT NOT NULL PRIMARY KEY,
    "shopName" TEXT,
    "plan" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "installedAt" DATETIME NOT NULL,
    "uninstalledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Install" ("createdAt", "installedAt", "plan", "shopDomain", "shopName", "status", "uninstalledAt", "updatedAt") SELECT "createdAt", "installedAt", "plan", "shopDomain", "shopName", "status", "uninstalledAt", "updatedAt" FROM "Install";
DROP TABLE "Install";
ALTER TABLE "new_Install" RENAME TO "Install";
CREATE TABLE "new_Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopDomain" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "occurredAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Transaction" ("amount", "createdAt", "currency", "id", "occurredAt", "shopDomain", "type") SELECT "amount", "createdAt", "currency", "id", "occurredAt", "shopDomain", "type" FROM "Transaction";
DROP TABLE "Transaction";
ALTER TABLE "new_Transaction" RENAME TO "Transaction";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
