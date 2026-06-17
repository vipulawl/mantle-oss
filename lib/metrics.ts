import { db } from "./db";

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

  // MRR: current plan price per active subscriber; annual plans normalised to /12
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
    return sum + (r.billingInterval === "ANNUAL" ? r.amount / 12 : r.amount);
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

// MRR received per calendar month (annual charges normalised to /12).
// Approximates MRR trend — not a snapshot of "MRR at end of month" but
// the effective monthly-equivalent revenue collected each month.
export async function getMRRByMonth() {
  const transactions = await db.transaction.findMany({
    where: { type: "SALE", billingInterval: { not: null } },
    orderBy: { occurredAt: "asc" },
  });

  const byMonth: Record<string, number> = {};
  for (const t of transactions) {
    const month = t.occurredAt.toISOString().slice(0, 7);
    byMonth[month] = (byMonth[month] || 0) + (t.billingInterval === "ANNUAL" ? t.amount / 12 : t.amount);
  }

  return Object.entries(byMonth).map(([month, mrr]) => ({ month, mrr: Math.round(mrr * 100) / 100 }));
}

// New installs and churns per calendar month, merged into one series for the grouped bar chart.
export async function getInstallsAndChurnByMonth() {
  const installs = await db.install.findMany();

  const byMonth: Record<string, { installs: number; churns: number }> = {};

  const ensure = (m: string) => {
    if (!byMonth[m]) byMonth[m] = { installs: 0, churns: 0 };
  };

  for (const i of installs) {
    const installMonth = i.installedAt.toISOString().slice(0, 7);
    ensure(installMonth);
    byMonth[installMonth].installs++;

    if (i.uninstalledAt) {
      const churnMonth = i.uninstalledAt.toISOString().slice(0, 7);
      ensure(churnMonth);
      byMonth[churnMonth].churns++;
    }
  }

  return Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({ month, ...data }));
}
