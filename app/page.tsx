"use client";

import { useState, useEffect, useCallback } from "react";
import KPICard from "@/components/KPICard";
import RevenueChart from "@/components/RevenueChart";
import { useSyncEvents } from "@/hooks/useSyncEvents";
import { apiFetch } from "@/lib/apiFetch";

type Overview = {
  activeCustomers: number;
  totalInstalls: number;
  churnRate: number;
  mrr: number;
  totalRevenue: number;
  avgRating: number;
  totalReviews: number;
  lastSync: Record<string, string>;
};

type RevenueData = { revenueByDay: { date: string; revenue: number }[] };

export default function OverviewPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [revenue, setRevenue] = useState<RevenueData | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const [o, r] = await Promise.all([
      apiFetch<Overview>("/api/overview"),
      apiFetch<RevenueData>("/api/revenue?days=30"),
    ]);
    if (o) { setOverview(o); setError(null); } else setError("API error — check terminal");
    if (r) setRevenue(r);
    setLastUpdated(new Date().toLocaleTimeString());
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useSyncEvents((event) => {
    if (event.type !== "error") fetchData();
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-white">Overview</h1>
          {lastUpdated && (
            <p className="text-zinc-500 text-xs mt-0.5">Last updated {lastUpdated}</p>
          )}
        </div>
        <button
          onClick={fetchData}
          className="text-xs text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 px-3 py-1.5 rounded-lg transition-colors"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-red-900/30 border border-red-800 rounded-lg px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPICard
          label="MRR (30d)"
          value={overview ? `$${overview.mrr.toLocaleString()}` : "—"}
        />
        <KPICard
          label="Active Customers"
          value={overview?.activeCustomers ?? "—"}
          sub={overview ? `${overview.totalInstalls} total installs` : undefined}
        />
        <KPICard
          label="Churn Rate"
          value={overview ? `${overview.churnRate}%` : "—"}
          trend={overview && overview.churnRate > 10 ? "down" : "neutral"}
        />
        <KPICard
          label="Avg Rating"
          value={overview ? `${overview.avgRating} / 5` : "—"}
          sub={overview ? `${overview.totalReviews} reviews` : undefined}
          trend={overview && overview.avgRating >= 4 ? "up" : "neutral"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <p className="text-zinc-400 text-xs uppercase tracking-wider mb-4">
            Revenue — last 30 days
          </p>
          <RevenueChart data={revenue?.revenueByDay ?? []} />
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <p className="text-zinc-400 text-xs uppercase tracking-wider mb-4">
            Total Revenue
          </p>
          <p className="text-white text-3xl font-semibold">
            {overview ? `$${overview.totalRevenue.toLocaleString()}` : "—"}
          </p>
          <p className="text-zinc-500 text-xs mt-2">Net of refunds, all time</p>
          <div className="mt-6 space-y-2">
            {overview?.lastSync &&
              Object.entries(overview.lastSync).map(([key, val]) => (
                <div key={key} className="flex justify-between text-xs">
                  <span className="text-zinc-500 capitalize">
                    {key.replace("last", "").replace("Sync", " sync")}
                  </span>
                  <span className="text-zinc-400">
                    {new Date(val).toLocaleTimeString()}
                  </span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
