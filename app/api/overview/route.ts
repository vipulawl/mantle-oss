import { getOverviewMetrics } from "@/lib/metrics";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [metrics, syncMeta] = await Promise.all([
      getOverviewMetrics(),
      db.syncMeta.findMany(),
    ]);

    const meta: Record<string, string> = {};
    for (const m of syncMeta) meta[m.key] = m.value;

    return Response.json({ ...metrics, lastSync: meta });
  } catch (err) {
    console.error("[/api/overview]", err);
    return Response.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
