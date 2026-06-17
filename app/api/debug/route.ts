import { db } from "@/lib/db";
import { scrapeReviews } from "@/lib/scraper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const [installCount, txCount, reviewCount] = await Promise.all([
    db.install.count(),
    db.transaction.count(),
    db.review.count(),
  ]);

  // Live scrape test — returns first 2 reviews as scraped, before writing to DB
  let scrapeSample: unknown = null;
  try {
    const reviews = await scrapeReviews();
    scrapeSample = reviews.slice(0, 2);
  } catch (e) {
    scrapeSample = String(e);
  }

  return Response.json({
    db: { installs: installCount, transactions: txCount, reviews: reviewCount },
    scrapeSample,
  });
}
