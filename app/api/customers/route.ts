import { db } from "@/lib/db";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function formatPlan(billingInterval: string | null): string | null {
  if (!billingInterval) return null;
  if (billingInterval === "EVERY_30_DAYS") return "Monthly";
  if (billingInterval === "ANNUAL") return "Annual";
  return billingInterval;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("filter") || "all";
    const search = searchParams.get("q");

    const searchWhere = search
      ? { OR: [{ shopDomain: { contains: search } }, { shopName: { contains: search } }] }
      : {};

    const statusWhere =
      filter === "installed" || filter === "subscribed"
        ? { status: "active" }
        : filter === "uninstalled"
        ? { status: "churned" }
        : {};

    const installs = await db.install.findMany({
      where: { ...statusWhere, ...searchWhere },
      orderBy: { installedAt: "desc" },
    });

    // For all views: attach per-customer revenue and current plan
    const domains = installs.map((i) => i.shopDomain);

    const [revenueRows, planRows] = await Promise.all([
      db.transaction.groupBy({
        by: ["shopDomain"],
        where: { shopDomain: { in: domains }, type: "SALE" },
        _sum: { amount: true },
      }),
      // Most recent subscription sale per shop → gives current billing interval
      db.transaction.findMany({
        where: { shopDomain: { in: domains }, type: "SALE", billingInterval: { not: null } },
        orderBy: { occurredAt: "desc" },
        distinct: ["shopDomain"],
        select: { shopDomain: true, billingInterval: true, amount: true },
      }),
    ]);

    const revenueMap = new Map(revenueRows.map((r) => [r.shopDomain, r._sum.amount ?? 0]));
    const planMap = new Map(planRows.map((r) => [r.shopDomain, { billingInterval: r.billingInterval, amount: r.amount }]));

    const enriched = installs.map((i) => ({
      ...i,
      totalRevenue: revenueMap.get(i.shopDomain) ?? 0,
      billingInterval: planMap.get(i.shopDomain)?.billingInterval ?? null,
      planLabel: formatPlan(planMap.get(i.shopDomain)?.billingInterval ?? null),
      planAmount: planMap.get(i.shopDomain)?.amount ?? null,
    }));

    // "Subscribed" = active + has paid at least once
    const filtered =
      filter === "subscribed"
        ? enriched.filter((c) => c.totalRevenue > 0)
        : enriched;

    return Response.json(filtered);
  } catch (err) {
    console.error("[/api/customers]", err);
    return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
