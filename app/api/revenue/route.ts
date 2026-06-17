import { getRevenueByDay, getMRRByMonth, getInstallsAndChurnByMonth } from "@/lib/metrics";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get("days") || "90", 10);

    const [revenueByDay, mrrByMonth, installsByMonth] = await Promise.all([
      getRevenueByDay(days),
      getMRRByMonth(),
      getInstallsAndChurnByMonth(),
    ]);

    return Response.json({ revenueByDay, mrrByMonth, installsByMonth });
  } catch (err) {
    console.error("[/api/revenue]", err);
    return Response.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
