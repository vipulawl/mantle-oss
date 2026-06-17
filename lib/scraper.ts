import * as cheerio from "cheerio";

export type ScrapedReview = {
  id: string;
  author: string;
  rating: number;
  body: string;
  reviewedAt: Date;
};

export async function scrapeReviews(): Promise<ScrapedReview[]> {
  const handle = process.env.SHOPIFY_APP_HANDLE;
  if (!handle) throw new Error("SHOPIFY_APP_HANDLE not set");

  const reviews: ScrapedReview[] = [];
  let page = 1;

  while (true) {
    const url = `https://apps.shopify.com/${handle}/reviews?page=${page}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; mantle-oss/1.0; +https://github.com/your-username/mantle-oss)",
      },
    });

    if (!res.ok) break;

    const html = await res.text();
    const $ = cheerio.load(html);

    const pageReviews: ScrapedReview[] = [];

    $("[data-review-id]").each((_, el) => {
      const $el = $(el);
      const id = $el.attr("data-review-id") || "";
      const author = $el.find("[data-review-author]").text().trim() || "Anonymous";
      const ratingStr = $el.find("[aria-label*='out of']").attr("aria-label") || "";
      const rating = parseInt(ratingStr.match(/(\d)/)?.[1] || "0", 10);
      const body = $el.find("[data-review-body]").text().trim();
      const dateStr = $el.find("time").attr("datetime") || new Date().toISOString();

      if (id) {
        pageReviews.push({
          id,
          author,
          rating,
          body,
          reviewedAt: new Date(dateStr),
        });
      }
    });

    if (pageReviews.length === 0) break;
    reviews.push(...pageReviews);
    page++;

    await new Promise((r) => setTimeout(r, 500));
  }

  return reviews;
}
