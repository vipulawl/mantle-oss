import { db } from "@/lib/db";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("q");
    const types = searchParams.get("types");

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { shopDomain: { contains: search } },
        { shopName: { contains: search } },
      ];
    }

    if (types) {
      where.type = { in: types.split(",") };
    }

    const events = await db.appEvent.findMany({
      where,
      orderBy: { occurredAt: "desc" },
      take: 500,
    });

    return Response.json(events);
  } catch (err) {
    console.error("[/api/activity]", err);
    return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
