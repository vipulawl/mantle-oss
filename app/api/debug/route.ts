import { db } from "@/lib/db";
import { fetchAllInstalls, fetchAllTransactions } from "@/lib/shopify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const [installCount, txCount, reviewCount] = await Promise.all([
    db.install.count(),
    db.transaction.count(),
    db.review.count(),
  ]);

  // Test: try writing one install directly
  let writeTest: unknown = null;
  try {
    await db.install.upsert({
      where: { shopDomain: "__debug_test__.myshopify.com" },
      update: { shopName: "debug", status: "active" },
      create: {
        shopDomain: "__debug_test__.myshopify.com",
        shopName: "debug",
        status: "active",
        installedAt: new Date(),
      },
    });
    await db.install.delete({ where: { shopDomain: "__debug_test__.myshopify.com" } });
    writeTest = "ok";
  } catch (e) {
    writeTest = String(e);
  }

  // Test: fetch from API and write first shop
  let apiWriteTest: unknown = null;
  try {
    const shops = await fetchAllInstalls();
    if (shops.length > 0) {
      await db.install.upsert({
        where: { shopDomain: shops[0].shopDomain },
        update: { shopName: shops[0].shopName, status: shops[0].status, uninstalledAt: shops[0].uninstalledAt },
        create: {
          shopDomain: shops[0].shopDomain,
          shopName: shops[0].shopName,
          status: shops[0].status,
          installedAt: shops[0].installedAt,
          uninstalledAt: shops[0].uninstalledAt,
        },
      });
      apiWriteTest = `wrote ${shops[0].shopDomain}`;
    } else {
      apiWriteTest = "no shops returned from API";
    }
  } catch (e) {
    apiWriteTest = String(e);
  }

  // Fetch App Store HTML to check review selectors
  let reviewHtmlSample: unknown = null;
  const handle = process.env.SHOPIFY_APP_HANDLE;
  if (handle) {
    try {
      const res = await fetch(`https://apps.shopify.com/${handle}/reviews?page=1`, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; mantle-oss/1.0)" },
      });
      const html = await res.text();
      // Return the first review-looking block
      const start = html.indexOf("review");
      reviewHtmlSample = html.slice(Math.max(0, start - 100), start + 2000);
    } catch (e) {
      reviewHtmlSample = String(e);
    }
  }

  return Response.json({
    db: { installs: installCount, transactions: txCount, reviews: reviewCount },
    writeTest,
    apiWriteTest,
    reviewHtmlSample,
  });
}
