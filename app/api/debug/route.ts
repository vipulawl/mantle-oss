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
        headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36" },
      });
      const html = await res.text();
      const $ = cheerio.load(html);

      // Show what's inside data-review-id elements
      const reviewElements: unknown[] = [];
      $("[data-review-id]").each((_, el) => {
        reviewElements.push({
          outerHtml: $(el).prop("outerHTML")?.slice(0, 1000),
          dataAttrs: Object.fromEntries(
            Object.entries((el as { attribs?: Record<string, string> }).attribs ?? {})
              .filter(([k]) => k.startsWith("data-"))
          ),
          children: $(el).children().map((_, c) => ({
            tag: (c as { tagName?: string }).tagName,
            attrs: (c as { attribs?: Record<string, string> }).attribs,
            text: $(c).text().slice(0, 100),
          })).get(),
        });
      });

      // Also extract any JSON-LD review objects
      const jsonLdBlocks: unknown[] = [];
      $("script[type='application/ld+json']").each((_, el) => {
        try { jsonLdBlocks.push(JSON.parse($(el).html() ?? "")); } catch {}
      });

      // Look for __NEXT_DATA__ or similar hydration data
      const nextData = $("script#__NEXT_DATA__").html();

      reviewDebug = {
        statusCode: res.status,
        reviewElementCount: reviewElements.length,
        reviewElements: reviewElements.slice(0, 2),
        jsonLd: jsonLdBlocks,
        hasNextData: !!nextData,
        nextDataSample: nextData?.slice(0, 500),
      };
    } catch (e) {
      reviewDebug = String(e);
    }
  }

  return Response.json({ db: { installs: installCount, transactions: txCount, reviews: reviewCount }, reviewDebug });
}
