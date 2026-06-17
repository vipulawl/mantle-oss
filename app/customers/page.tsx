"use client";

import { useState, useEffect, useCallback } from "react";
import CustomerTable from "@/components/CustomerTable";
import { useSyncEvents } from "@/hooks/useSyncEvents";
import { apiFetch } from "@/lib/apiFetch";

type Customer = {
  shopDomain: string;
  shopName: string | null;
  status: string;
  installedAt: string;
  uninstalledAt: string | null;
  totalRevenue: number;
  planLabel: string | null;
  planAmount: number | null;
};

const FILTERS = [
  { key: "paid",        label: "Paid" },
  { key: "installed",   label: "Installed" },
  { key: "uninstalled", label: "Uninstalled" },
  { key: "all",         label: "All" },
];

function exportCSV(customers: Customer[], filter: string) {
  const headers = ["Shop Domain", "Shop Name", "Store URL", "Status", "Installed At"];
  if (filter === "paid") {
    headers.splice(3, 0, "Plan", "Plan Amount", "Total Revenue");
  }
  if (filter === "uninstalled" || filter === "all") {
    headers.push("Uninstalled At");
  }

  const rows = customers.map((c) => {
    const base: (string | number)[] = [
      c.shopDomain,
      c.shopName ?? "",
      `https://${c.shopDomain}`,
      c.status,
      new Date(c.installedAt).toISOString().slice(0, 10),
    ];
    if (filter === "paid") {
      base.splice(3, 0, c.planLabel ?? "", c.planAmount?.toFixed(2) ?? "", c.totalRevenue.toFixed(2));
    }
    if (filter === "uninstalled" || filter === "all") {
      base.push(c.uninstalledAt ? new Date(c.uninstalledAt).toISOString().slice(0, 10) : "");
    }
    return base;
  });

  const csv = [headers, ...rows]
    .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `customers-${filter}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filter, setFilter] = useState("paid");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fetchCustomers = useCallback(async () => {
    const params = new URLSearchParams({ filter });
    if (search) params.set("q", search);
    const data = await apiFetch<Customer[]>(`/api/customers?${params}`);
    if (data) { setCustomers(data); setError(null); }
    else setError("Failed to load customers — check terminal");
  }, [filter, search]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  useSyncEvents((event) => {
    if (event.type === "installs" || event.type === "transactions") fetchCustomers();
  });

  const totalRevenue = customers.reduce((sum, c) => sum + c.totalRevenue, 0);

  return (
    <div className="p-8">
      <h1 className="text-xl font-semibold text-white mb-6">Customers</h1>

      {error && (
        <div className="mb-4 bg-red-900/30 border border-red-800 rounded-lg px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {filter === "paid" && customers.length > 0 && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <p className="text-zinc-400 text-xs uppercase tracking-wider mb-1">Paying Customers</p>
            <p className="text-white text-2xl font-semibold">{customers.length}</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <p className="text-zinc-400 text-xs uppercase tracking-wider mb-1">Total Revenue (this view)</p>
            <p className="text-emerald-400 text-2xl font-semibold">${totalRevenue.toFixed(2)}</p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          placeholder="Search by domain or name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 rounded-lg px-3 py-2 text-sm flex-1 max-w-xs focus:outline-none focus:border-zinc-500"
        />
        <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                filter === key
                  ? "bg-zinc-700 text-white"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          onClick={() => exportCSV(customers, filter)}
          disabled={customers.length === 0}
          className="ml-auto px-3 py-1.5 rounded-lg text-sm bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Export CSV
        </button>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <p className="text-zinc-500 text-xs mb-4">{customers.length} customers</p>
        <CustomerTable customers={customers} filter={filter} />

        {filter === "paid" && (
          <p className="mt-6 text-zinc-600 text-xs">
            Shows stores with a completed charge within the expected billing window (monthly: last 37 days, annual: last 400 days).
            Stores on a free trial or mid-cycle before their first charge are not visible here — the Shopify Partner API only records completed payments.
          </p>
        )}
      </div>
    </div>
  );
}
