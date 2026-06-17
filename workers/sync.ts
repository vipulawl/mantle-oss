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

function logError(context: string, err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`[mantle-oss] ${context}: ${msg}`);
  emit({ type: "error", timestamp: new Date().toISOString(), message: `${context}: ${msg}` });
}

export async function syncInstalls() {
  try {
    const shops = await fetchAllInstalls();
    console.log(`[mantle-oss] syncInstalls: fetched ${shops.length} shops from API`);

    for (const shop of shops) {
      await db.install.upsert({
        where: { shopDomain: shop.shopDomain },
        update: {
          shopName: shop.shopName,
          status: shop.status,
          uninstalledAt: shop.uninstalledAt,
        },
        create: {
          shopDomain: shop.shopDomain,
          shopName: shop.shopName,
          status: shop.status,
          installedAt: shop.installedAt,
          uninstalledAt: shop.uninstalledAt,
        },
      });
    }

    await db.syncMeta.upsert({
      where: { key: "lastInstallSync" },
      update: { value: new Date().toISOString() },
      create: { key: "lastInstallSync", value: new Date().toISOString() },
    });

    console.log(`[mantle-oss] syncInstalls: wrote ${shops.length} shops to DB`);
    emit({ type: "installs", timestamp: new Date().toISOString(), message: `Synced ${shops.length} shops` });
  } catch (err) {
    logError("Install sync failed", err);
  }
}

export async function syncTransactions() {
  try {
    const transactions = await fetchAllTransactions();
    console.log(`[mantle-oss] syncTransactions: fetched ${transactions.length} transactions from API`);

    for (const tx of transactions) {
      const isRefund = tx.id.includes("Refund");

      await db.transaction.upsert({
        where: { id: tx.id },
        update: {},
        create: {
          id: tx.id,
          shopDomain: tx.shop!.myshopifyDomain,
          type: isRefund ? "REFUND" : "SALE",
          amount: Math.abs(parseFloat(tx.grossAmount!.amount)),
          currency: tx.grossAmount!.currencyCode,
          billingInterval: tx.billingInterval ?? null,
          occurredAt: new Date(tx.createdAt),
        },
      });
    }

    await db.syncMeta.upsert({
      where: { key: "lastTransactionSync" },
      update: { value: new Date().toISOString() },
      create: { key: "lastTransactionSync", value: new Date().toISOString() },
    });

    console.log(`[mantle-oss] syncTransactions: wrote ${transactions.length} transactions to DB`);
    emit({ type: "transactions", timestamp: new Date().toISOString(), message: `Synced ${transactions.length} transactions` });
  } catch (err) {
    logError("Transaction sync failed", err);
  }
}

export async function syncReviews() {
  try {
    const reviews = await scrapeReviews();
    console.log(`[mantle-oss] syncReviews: fetched ${reviews.length} reviews`);

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

    console.log(`[mantle-oss] syncReviews: wrote ${reviews.length} reviews to DB`);
    emit({ type: "reviews", timestamp: new Date().toISOString(), message: `Synced ${reviews.length} reviews` });
  } catch (err) {
    logError("Review sync failed", err);
  }
}
