import { getRevenueByDay, getChurnByMonth } from "@/lib/metrics";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const days = parseInt(searchParams.get("days") || "90", 10);

  const [revenueByDay, churnByMonth] = await Promise.all([
    getRevenueByDay(days),
    getChurnByMonth(),
  ]);

  return Response.json({ revenueByDay, churnByMonth });
}
