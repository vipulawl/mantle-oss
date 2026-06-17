import { db } from "./db";

// Subscription charge event types that indicate an active subscription
const SUB_EVENT_TYPES = [
  "SUBSCRIPTION_CHARGE_ACTIVATED",
  "SUBSCRIPTION_CHARGE_ACCEPTED",
  "SUBSCRIPTION_CHARGE_CANCELED",
  "SUBSCRIPTION_CHARGE_DECLINED",
  "SUBSCRIPTION_CHARGE_EXPIRED",
  "SUBSCRIPTION_CHARGE_FROZEN",
  "SUBSCRIPTION_CHARGE_UNFROZEN",
];
const ACTIVE_SUB_EVENTS = new Set(["SUBSCRIPTION_CHARGE_ACTIVATED", "SUBSCRIPTION_CHARGE_UNFROZEN"]);

// Returns domains with a currently active subscription based on their last charge event.
async function getSubscribedDomains(): Promise<Set<string>> {
  const latestSubEvents = await db.appEvent.findMany({
    where: { type: { in: SUB_EVENT_TYPES } },
    orderBy: { occurredAt: "desc" },
    distinct: ["shopDomain"],
    select: { shopDomain: true, type: true },
  });
  return new Set(
    latestSubEvents.filter((e) => ACTIVE_SUB_EVENTS.has(e.type)).map((e) => e.shopDomain)
  );
}

export async function getOverviewMetrics() {
  const [installs, transactions, reviews, subscribedDomains] = await Promise.all([
    db.install.findMany(),
    db.transaction.findMany(),
    db.review.findMany(),
    getSubscribedDomains(),
  ]);

  const activeInstalls = installs.filter((i) => i.status === "active");
  const churnedInstalls = installs.filter((i) => i.status === "churned");
  const churnRate =
    installs.length > 0 ? (churnedInstalls.length / installs.length) * 100 : 0;

  const sales = transactions.filter((t) => t.type === "SALE");
  const refunds = transactions.filter((t) => t.type === "REFUND");
  const totalRevenue = sales.reduce((sum, t) => sum + t.amount, 0);
  const totalRefunds = refunds.reduce((sum, t) => sum + t.amount, 0);
  const netRevenue = totalRevenue - totalRefunds;

  // MRR: sum of current plan amounts for active subscribers only.
  // Monthly plans contribute their amount directly; annual plans contribute amount/12.
  // Uses the most recent SALE transaction per shop to get the current plan price.
  const planRows = await db.transaction.findMany({
    where: {
      shopDomain: { in: [...subscribedDomains] },
      type: "SALE",
      billingInterval: { not: null },
    },
    orderBy: { occurredAt: "desc" },
    distinct: ["shopDomain"],
    select: { shopDomain: true, billingInterval: true, amount: true },
  });

  const mrr = planRows.reduce((sum, r) => {
    if (r.billingInterval === "ANNUAL") return sum + r.amount / 12;
    return sum + r.amount;
  }, 0);

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  return {
    activeCustomers: activeInstalls.length,
    totalInstalls: installs.length,
    churnRate: Math.round(churnRate * 10) / 10,
    mrr: Math.round(mrr * 100) / 100,
    totalRevenue: Math.round(netRevenue * 100) / 100,
    avgRating: Math.round(avgRating * 10) / 10,
    totalReviews: reviews.length,
  };
}

export async function getRevenueByDay(days = 90) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const transactions = await db.transaction.findMany({
    where: { occurredAt: { gte: since } },
    orderBy: { occurredAt: "asc" },
  });

  const byDay: Record<string, number> = {};
  for (const t of transactions) {
    const day = t.occurredAt.toISOString().split("T")[0];
    byDay[day] = (byDay[day] || 0) + (t.type === "SALE" ? t.amount : -t.amount);
  }

  return Object.entries(byDay).map(([date, revenue]) => ({ date, revenue }));
}

export async function getChurnByMonth() {
  const churned = await db.install.findMany({
    where: { status: "churned", uninstalledAt: { not: null } },
  });

  const byMonth: Record<string, number> = {};
  for (const i of churned) {
    if (!i.uninstalledAt) continue;
    const month = i.uninstalledAt.toISOString().slice(0, 7);
    byMonth[month] = (byMonth[month] || 0) + 1;
  }

  return Object.entries(byMonth).map(([month, count]) => ({ month, count }));
}
