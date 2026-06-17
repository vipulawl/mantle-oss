import { getOverviewMetrics } from "@/lib/metrics";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const [metrics, syncMeta] = await Promise.all([
    getOverviewMetrics(),
    db.syncMeta.findMany(),
  ]);

  const meta: Record<string, string> = {};
  for (const m of syncMeta) meta[m.key] = m.value;

  return Response.json({ ...metrics, lastSync: meta });
}
