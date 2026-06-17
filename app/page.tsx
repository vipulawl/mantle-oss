"use client";

import { useState, useEffect, useCallback } from "react";
import KPICard from "@/components/KPICard";
import RevenueChart from "@/components/RevenueChart";
import { useSyncEvents } from "@/hooks/useSyncEvents";
import { apiFetch } from "@/lib/apiFetch";
import {
  AreaChart, Area,
  BarChart, Bar,
  XAxis, YAxis,
  CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";

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

type RevenueData = {
  revenueByDay: { date: string; revenue: number }[];
  mrrByMonth: { month: string; mrr: number }[];
  installsByMonth: { month: string; installs: number; churns: number }[];
};

const RANGES = [
  { label: "3M",  days: 90,   months: 3  },
  { label: "6M",  days: 180,  months: 6  },
  { label: "1Y",  days: 365,  months: 12 },
  { label: "All", days: 3650, months: 0  },
] as const;

type RangeKey = typeof RANGES[number]["label"];

function sliceMonths<T extends { month: string }>(data: T[], months: number): T[] {
  if (months === 0) return data;
  return data.slice(-months);
}

export default function OverviewPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [revenue, setRevenue] = useState<RevenueData | null>(null);
  const [range, setRange] = useState<RangeKey>("3M");
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const current = RANGES.find((r) => r.label === range)!;

  const fetchData = useCallback(async () => {
    const [o, r] = await Promise.all([
      apiFetch<Overview>("/api/overview"),
      apiFetch<RevenueData>(`/api/revenue?days=${current.days}`),
    ]);
    if (o) { setOverview(o); setError(null); } else setError("API error — check terminal");
    if (r) setRevenue(r);
    setLastUpdated(new Date().toLocaleTimeString());
  }, [current.days]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useSyncEvents((event) => {
    if (event.type !== "error") fetchData();
  });

  const mrrData      = sliceMonths(revenue?.mrrByMonth      ?? [], current.months);
  const installsData = sliceMonths(revenue?.installsByMonth  ?? [], current.months);
  const dailyData    = revenue?.revenueByDay ?? [];

  const tooltipStyle = {
    contentStyle: { background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8 },
    labelStyle: { color: "#a1a1aa" },
  };

  const RangeToggle = () => (
    <div className="flex gap-1 bg-zinc-800 border border-zinc-700 rounded-lg p-1">
      {RANGES.map(({ label }) => (
        <button
          key={label}
          onClick={() => setRange(label)}
          className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
            range === label ? "bg-zinc-600 text-white" : "text-zinc-400 hover:text-white"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-white">Overview</h1>
          {lastUpdated && (
            <p className="text-zinc-500 text-xs mt-0.5">Last updated {lastUpdated}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <RangeToggle />
          <button
            onClick={fetchData}
            className="text-xs text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 px-3 py-1.5 rounded-lg transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-900/30 border border-red-800 rounded-lg px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard label="MRR" value={overview ? `$${overview.mrr.toLocaleString()}` : "—"} />
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

      {/* MRR trend + Daily revenue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <p className="text-zinc-400 text-xs uppercase tracking-wider mb-4">MRR by month</p>
          {mrrData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={mrrData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="mrrGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="month" tick={{ fill: "#71717a", fontSize: 11 }} />
                <YAxis tick={{ fill: "#71717a", fontSize: 11 }} tickFormatter={(v) => `$${v}`} width={55} />
                <Tooltip {...tooltipStyle} itemStyle={{ color: "#818cf8" }} formatter={(v) => [`$${Number(v).toFixed(2)}`, "MRR"]} />
                <Area type="monotone" dataKey="mrr" stroke="#818cf8" strokeWidth={2} fill="url(#mrrGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-52 flex items-center justify-center text-zinc-500 text-sm">No data yet</div>
          )}
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <p className="text-zinc-400 text-xs uppercase tracking-wider mb-4">Daily Revenue</p>
          <RevenueChart data={dailyData} />
        </div>
      </div>

      {/* Installs + Churn by month */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-4">
        <p className="text-zinc-400 text-xs uppercase tracking-wider mb-4">Installs & Churn by month</p>
        {installsData.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={installsData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="month" tick={{ fill: "#71717a", fontSize: 11 }} />
              <YAxis tick={{ fill: "#71717a", fontSize: 11 }} width={30} allowDecimals={false} />
              <Tooltip {...tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11, color: "#71717a", paddingTop: 8 }} />
              <Bar dataKey="installs" name="Installs" fill="#34d399" radius={[3, 3, 0, 0]} />
              <Bar dataKey="churns"   name="Churns"   fill="#f87171" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-52 flex items-center justify-center text-zinc-500 text-sm">No data yet</div>
        )}
      </div>

      {/* Total revenue + sync info */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-zinc-400 text-xs uppercase tracking-wider mb-1">Total Revenue</p>
            <p className="text-white text-3xl font-semibold">
              {overview ? `$${overview.totalRevenue.toLocaleString()}` : "—"}
            </p>
            <p className="text-zinc-500 text-xs mt-1">Net of refunds, all time</p>
          </div>
          <div className="space-y-1.5 text-right">
            {overview?.lastSync &&
              Object.entries(overview.lastSync).map(([key, val]) => (
                <div key={key} className="flex gap-4 text-xs">
                  <span className="text-zinc-500 capitalize">
                    {key.replace("last", "").replace("Sync", " sync")}
                  </span>
                  <span className="text-zinc-400">{new Date(val).toLocaleTimeString()}</span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
