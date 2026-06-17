"use client";

import { useState, useEffect, useCallback } from "react";
import RevenueChart from "@/components/RevenueChart";
import { useSyncEvents } from "@/hooks/useSyncEvents";
import { apiFetch } from "@/lib/apiFetch";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type RevenueData = {
  revenueByDay: { date: string; revenue: number }[];
  churnByMonth: { month: string; count: number }[];
};

export default function RevenuePage() {
  const [data, setData] = useState<RevenueData | null>(null);
  const [days, setDays] = useState(90);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const res = await apiFetch<RevenueData>(`/api/revenue?days=${days}`);
    if (res) { setData(res); setError(null); }
    else setError("API error — check terminal");
  }, [days]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useSyncEvents((event) => {
    if (event.type === "transactions") fetchData();
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-xl font-semibold text-white">Revenue</h1>
        <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
          {[30, 60, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                days === d ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-white"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-900/30 border border-red-800 rounded-lg px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <p className="text-zinc-400 text-xs uppercase tracking-wider mb-4">
            Daily Revenue — last {days} days
          </p>
          <RevenueChart data={data?.revenueByDay ?? []} />
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <p className="text-zinc-400 text-xs uppercase tracking-wider mb-4">
            Monthly Churns
          </p>
          {data?.churnByMonth && data.churnByMonth.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.churnByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="month" tick={{ fill: "#71717a", fontSize: 11 }} />
                <YAxis tick={{ fill: "#71717a", fontSize: 11 }} width={30} />
                <Tooltip
                  contentStyle={{
                    background: "#18181b",
                    border: "1px solid #3f3f46",
                    borderRadius: 8,
                  }}
                  labelStyle={{ color: "#a1a1aa" }}
                  itemStyle={{ color: "#f87171" }}
                />
                <Bar dataKey="count" fill="#f87171" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-zinc-500 text-sm">
              No churn data yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
