import { db } from "./db";

export async function getOverviewMetrics() {
  const [installs, transactions, reviews] = await Promise.all([
    db.install.findMany(),
    db.transaction.findMany(),
    db.review.findMany(),
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

  // MRR: sum of all active subscription sales in the last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentSales = sales.filter((t) => new Date(t.occurredAt) >= thirtyDaysAgo);
  const mrr = recentSales.reduce((sum, t) => sum + t.amount, 0);

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
