import { db } from "@/lib/db";
import * as cheerio from "cheerio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const [installCount, txCount, reviewCount] = await Promise.all([
    db.install.count(),
    db.transaction.count(),
    db.review.count(),
  ]);

  const handle = process.env.SHOPIFY_APP_HANDLE;
  let reviewDebug: unknown = null;

  if (handle) {
    try {
      const res = await fetch(`https://apps.shopify.com/${handle}/reviews?page=1`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml",
        },
      });
      const html = await res.text();
      const $ = cheerio.load(html);

      // Walk up from the share button to the review card, grab full outer HTML of grandparent
      const ancestors: unknown[] = [];
      $("[data-review-id]").each((_, el) => {
        const id = $(el).attr("data-review-id");
        // Walk up 4 levels to find review card container
        const gp2 = $(el).parent().parent();
        const gp3 = $(el).parent().parent().parent();
        const gp4 = $(el).parent().parent().parent().parent();
        ancestors.push({
          id,
          gp2Html: gp2.prop("outerHTML")?.slice(0, 500),
          gp3Html: gp3.prop("outerHTML")?.slice(0, 800),
          gp4Html: gp4.prop("outerHTML")?.slice(0, 1500),
        });
      });

      // Also try fetching the individual review page
      let singleReviewHtml: unknown = null;
      const firstId = $("[data-review-id]").first().attr("data-review-id");
      if (firstId) {
        const r = await fetch(`https://apps.shopify.com/reviews/${firstId}`, {
          headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" },
        });
        const rHtml = await r.text();
        const r$ = cheerio.load(rHtml);
        // Look for JSON-LD Review type
        const jsonLd: unknown[] = [];
        r$("script[type='application/ld+json']").each((_, s) => {
          try { jsonLd.push(JSON.parse(r$(s).html() ?? "")); } catch {}
        });
        singleReviewHtml = { status: r.status, jsonLd, bodySnippet: rHtml.slice(0, 2000) };
      }

      reviewDebug = { ancestors, singleReviewHtml };
    } catch (e) {
      reviewDebug = String(e);
    }
  }

  return Response.json({ db: { installs: installCount, transactions: txCount, reviews: reviewCount }, reviewDebug });
}
