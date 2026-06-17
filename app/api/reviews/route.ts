import { db } from "@/lib/db";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rating = searchParams.get("rating");

  const reviews = await db.review.findMany({
    where: rating ? { rating: parseInt(rating, 10) } : {},
    orderBy: { reviewedAt: "desc" },
  });

  const ratingBreakdown = await db.review.groupBy({
    by: ["rating"],
    _count: { rating: true },
    orderBy: { rating: "desc" },
  });

  return Response.json({ reviews, ratingBreakdown });
}
