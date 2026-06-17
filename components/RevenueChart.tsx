"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type DataPoint = { date: string; revenue: number };

export default function RevenueChart({ data }: { data: DataPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-zinc-500 text-sm">
        No revenue data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis
          dataKey="date"
          tick={{ fill: "#71717a", fontSize: 11 }}
          tickFormatter={(v) => v.slice(5)}
        />
        <YAxis
          tick={{ fill: "#71717a", fontSize: 11 }}
          tickFormatter={(v) => `$${v}`}
          width={55}
        />
        <Tooltip
          contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8 }}
          labelStyle={{ color: "#a1a1aa" }}
          itemStyle={{ color: "#10b981" }}
          formatter={(v) => [`$${Number(v).toFixed(2)}`, "Revenue"]}
        />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="#10b981"
          strokeWidth={2}
          fill="url(#revenueGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
