import * as cheerio from "cheerio";

export type ScrapedReview = {
  id: string;
  author: string;
  rating: number;
  body: string;
  reviewedAt: Date;
};

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml",
};

export async function scrapeReviews(): Promise<ScrapedReview[]> {
  const handle = process.env.SHOPIFY_APP_HANDLE;
  if (!handle) throw new Error("SHOPIFY_APP_HANDLE not set");

  const reviews: ScrapedReview[] = [];
  let page = 1;

  while (true) {
    const url = `https://apps.shopify.com/${handle}/reviews?page=${page}`;
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) break;

    const html = await res.text();
    const $ = cheerio.load(html);
    const pageReviews: ScrapedReview[] = [];

    // Container: [data-review-content-id] — each review card has this attribute
    $("[data-review-content-id]").each((_, el) => {
      const $el = $(el);
      const id = $el.attr("data-review-content-id") || "";

      // Rating: aria-label="N out of 5 stars" on the stars container
      const ratingLabel = $el.find('[aria-label*="out of"]').first().attr("aria-label") || "";
      const rating = parseInt(ratingLabel.match(/^(\d+)/)?.[1] || "0", 10);

      // Author: span with a title attribute inside the heading div
      const author =
        $el.find(".tw-text-heading-xs span[title]").first().attr("title") ||
        $el.find("span[title]").not("[aria-label]").first().attr("title") ||
        "Anonymous";

      // Body: paragraph text in the main content column
      // The review text lives in a <p> in the col-span-3 section, after the rating row
      const body = $el
        .find("p")
        .map((_, p) => $(p).text().trim())
        .get()
        .filter((t) => t.length > 0)
        .join(" ");

      // Date: time[datetime] element
      const dateStr = $el.find("time[datetime]").first().attr("datetime");
      const reviewedAt = dateStr ? new Date(dateStr) : new Date();

      if (id) {
        pageReviews.push({ id, author, rating, body, reviewedAt });
      }
    });

    if (pageReviews.length === 0) break;
    reviews.push(...pageReviews);
    page++;

    await new Promise((r) => setTimeout(r, 600));
  }

  return reviews;
}
