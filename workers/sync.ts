import { db } from "@/lib/db";
import { fetchAllInstalls, fetchAllTransactions } from "@/lib/shopify";
import { scrapeReviews } from "@/lib/scraper";

export type SyncEvent = {
  type: "installs" | "transactions" | "reviews" | "error";
  timestamp: string;
  message: string;
};

const listeners = new Set<(event: SyncEvent) => void>();

export function subscribeSyncEvents(cb: (event: SyncEvent) => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function emit(event: SyncEvent) {
  for (const cb of listeners) cb(event);
}

export async function syncInstalls() {
  try {
    const installs = await fetchAllInstalls();

    for (const install of installs) {
      await db.install.upsert({
        where: { id: install.id },
        update: {
          shopName: install.shop.name,
          plan: install.activeSubscriptions[0]?.name || null,
          status: install.uninstalledAt ? "churned" : "active",
          uninstalledAt: install.uninstalledAt ? new Date(install.uninstalledAt) : null,
        },
        create: {
          id: install.id,
          shopDomain: install.shop.myshopifyDomain,
          shopName: install.shop.name,
          plan: install.activeSubscriptions[0]?.name || null,
          status: install.uninstalledAt ? "churned" : "active",
          installedAt: new Date(install.installedAt),
          uninstalledAt: install.uninstalledAt ? new Date(install.uninstalledAt) : null,
        },
      });
    }

    await db.syncMeta.upsert({
      where: { key: "lastInstallSync" },
      update: { value: new Date().toISOString() },
      create: { key: "lastInstallSync", value: new Date().toISOString() },
    });

    emit({
      type: "installs",
      timestamp: new Date().toISOString(),
      message: `Synced ${installs.length} installs`,
    });
  } catch (err) {
    emit({
      type: "error",
      timestamp: new Date().toISOString(),
      message: `Install sync failed: ${err instanceof Error ? err.message : String(err)}`,
    });
  }
}

export async function syncTransactions() {
  try {
    const transactions = await fetchAllTransactions();

    for (const tx of transactions) {
      const isRefund =
        tx.type?.toLowerCase().includes("refund") ||
        parseFloat(tx.grossAmount.amount) < 0;

      await db.transaction.upsert({
        where: { id: tx.id },
        update: {},
        create: {
          id: tx.id,
          shopDomain: tx.shop.myshopifyDomain,
          type: isRefund ? "REFUND" : "SALE",
          amount: Math.abs(parseFloat(tx.grossAmount.amount)),
          currency: tx.grossAmount.currencyCode,
          occurredAt: new Date(tx.createdAt),
        },
      });
    }

    await db.syncMeta.upsert({
      where: { key: "lastTransactionSync" },
      update: { value: new Date().toISOString() },
      create: { key: "lastTransactionSync", value: new Date().toISOString() },
    });

    emit({
      type: "transactions",
      timestamp: new Date().toISOString(),
      message: `Synced ${transactions.length} transactions`,
    });
  } catch (err) {
    emit({
      type: "error",
      timestamp: new Date().toISOString(),
      message: `Transaction sync failed: ${err instanceof Error ? err.message : String(err)}`,
    });
  }
}

export async function syncReviews() {
  try {
    const reviews = await scrapeReviews();

    for (const review of reviews) {
      await db.review.upsert({
        where: { id: review.id },
        update: { author: review.author, rating: review.rating, body: review.body },
        create: {
          id: review.id,
          author: review.author,
          rating: review.rating,
          body: review.body,
          reviewedAt: review.reviewedAt,
        },
      });
    }

    await db.syncMeta.upsert({
      where: { key: "lastReviewSync" },
      update: { value: new Date().toISOString() },
      create: { key: "lastReviewSync", value: new Date().toISOString() },
    });

    emit({
      type: "reviews",
      timestamp: new Date().toISOString(),
      message: `Synced ${reviews.length} reviews`,
    });
  } catch (err) {
    emit({
      type: "error",
      timestamp: new Date().toISOString(),
      message: `Review sync failed: ${err instanceof Error ? err.message : String(err)}`,
    });
  }
}
