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

// A shop is "currently paid" if their last charge is within the expected billing window.
// Monthly: last charge ≤ 37 days ago (30 + 7-day grace).
// Annual: last charge ≤ 400 days ago (365 + 35-day grace).
// Note: free-trial users and stores billed mid-cycle won't appear here — Partner API
// only sees completed charges, not pending or trial subscriptions.
function isActiveSubscription(lastTxDate: Date, billingInterval: string | null): boolean {
  const daysSince = (Date.now() - lastTxDate.getTime()) / (1000 * 60 * 60 * 24);
  if (billingInterval === "ANNUAL") return daysSince <= 400;
  return daysSince <= 37;
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
      filter === "installed" || filter === "paid"
        ? { status: "active" }
        : filter === "uninstalled"
        ? { status: "churned" }
        : {};

    const installs = await db.install.findMany({
      where: { ...statusWhere, ...searchWhere },
      orderBy: { installedAt: "desc" },
    });

    const domains = installs.map((i) => i.shopDomain);

    const [revenueRows, planRows] = await Promise.all([
      db.transaction.groupBy({
        by: ["shopDomain"],
        where: { shopDomain: { in: domains }, type: "SALE" },
        _sum: { amount: true },
      }),
      // Most recent subscription sale per shop → gives current billing interval and last charge date
      db.transaction.findMany({
        where: { shopDomain: { in: domains }, type: "SALE", billingInterval: { not: null } },
        orderBy: { occurredAt: "desc" },
        distinct: ["shopDomain"],
        select: { shopDomain: true, billingInterval: true, amount: true, occurredAt: true },
      }),
    ]);

    const revenueMap = new Map(revenueRows.map((r) => [r.shopDomain, r._sum.amount ?? 0]));
    const planMap = new Map(
      planRows.map((r) => [
        r.shopDomain,
        { billingInterval: r.billingInterval, amount: r.amount, occurredAt: r.occurredAt },
      ])
    );

    const enriched = installs.map((i) => ({
      ...i,
      totalRevenue: revenueMap.get(i.shopDomain) ?? 0,
      billingInterval: planMap.get(i.shopDomain)?.billingInterval ?? null,
      planLabel: formatPlan(planMap.get(i.shopDomain)?.billingInterval ?? null),
      planAmount: planMap.get(i.shopDomain)?.amount ?? null,
    }));

    const filtered =
      filter === "paid"
        ? enriched.filter((c) => {
            const plan = planMap.get(c.shopDomain);
            if (!plan) return false;
            return isActiveSubscription(plan.occurredAt, plan.billingInterval);
          })
        : enriched;

    return Response.json(filtered);
  } catch (err) {
    console.error("[/api/customers]", err);
    return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
