"use client";

import { useState, useEffect, useCallback } from "react";
import CustomerTable from "@/components/CustomerTable";
import { useSyncEvents } from "@/hooks/useSyncEvents";
import { apiFetch } from "@/lib/apiFetch";

type Customer = {
  shopDomain: string;
  shopName: string | null;
  plan: string | null;
  status: string;
  installedAt: string;
  uninstalledAt: string | null;
};


export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [status, setStatus] = useState("active");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fetchCustomers = useCallback(async () => {
    const params = new URLSearchParams();
    if (status !== "all") params.set("status", status);
    if (search) params.set("q", search);
    const data = await apiFetch<Customer[]>(`/api/customers?${params}`);
    if (data) {
      setCustomers(data);
      setError(null);
    } else {
      setError("Failed to load customers — check the terminal for details");
    }
  }, [status, search]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  useSyncEvents((event) => {
    if (event.type === "installs") fetchCustomers();
  });

  return (
    <div className="p-8">
      <h1 className="text-xl font-semibold text-white mb-6">Customers</h1>

      {error && (
        <div className="mb-4 bg-red-900/30 border border-red-800 rounded-lg px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-3 mb-6">
        <input
          type="text"
          placeholder="Search by domain or name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 rounded-lg px-3 py-2 text-sm flex-1 max-w-xs focus:outline-none focus:border-zinc-500"
        />
        <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
          {["active", "churned", "all"].map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`px-3 py-1 rounded-md text-sm transition-colors capitalize ${
                status === s
                  ? "bg-zinc-700 text-white"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <p className="text-zinc-500 text-xs mb-4">{customers.length} customers</p>
        <CustomerTable customers={customers} />
      </div>
    </div>
  );
}
