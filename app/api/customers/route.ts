import { db } from "@/lib/db";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// All subscription charge event types tracked in AppEvent
const SUB_EVENT_TYPES = [
  "SUBSCRIPTION_CHARGE_ACTIVATED",
  "SUBSCRIPTION_CHARGE_ACCEPTED",
  "SUBSCRIPTION_CHARGE_CANCELED",
  "SUBSCRIPTION_CHARGE_DECLINED",
  "SUBSCRIPTION_CHARGE_EXPIRED",
  "SUBSCRIPTION_CHARGE_FROZEN",
  "SUBSCRIPTION_CHARGE_UNFROZEN",
];

// A subscription is live if the most recent charge event is one of these
const ACTIVE_SUB_EVENTS = new Set([
  "SUBSCRIPTION_CHARGE_ACTIVATED",
  "SUBSCRIPTION_CHARGE_UNFROZEN",
]);

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

    const [revenueRows, planRows, latestSubEvents] = await Promise.all([
      db.transaction.groupBy({
        by: ["shopDomain"],
        where: { shopDomain: { in: domains }, type: "SALE" },
        _sum: { amount: true },
      }),
      // Most recent subscription transaction per shop → plan amount + billing interval
      db.transaction.findMany({
        where: { shopDomain: { in: domains }, type: "SALE", billingInterval: { not: null } },
        orderBy: { occurredAt: "desc" },
        distinct: ["shopDomain"],
        select: { shopDomain: true, billingInterval: true, amount: true },
      }),
      // Most recent subscription charge event per shop → determines if still active
      db.appEvent.findMany({
        where: { shopDomain: { in: domains }, type: { in: SUB_EVENT_TYPES } },
        orderBy: { occurredAt: "desc" },
        distinct: ["shopDomain"],
        select: { shopDomain: true, type: true },
      }),
    ]);

    const revenueMap = new Map(revenueRows.map((r) => [r.shopDomain, r._sum.amount ?? 0]));
    const planMap = new Map(planRows.map((r) => [r.shopDomain, { billingInterval: r.billingInterval, amount: r.amount }]));

    // Domains where the most recent subscription event means they're currently active
    const subscribedDomains = new Set(
      latestSubEvents.filter((e) => ACTIVE_SUB_EVENTS.has(e.type)).map((e) => e.shopDomain)
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
        ? enriched.filter((c) => subscribedDomains.has(c.shopDomain))
        : enriched;

    return Response.json(filtered);
  } catch (err) {
    console.error("[/api/customers]", err);
    return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
