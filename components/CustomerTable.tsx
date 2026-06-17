"use client";

import { formatDistanceToNow } from "date-fns";

type Customer = {
  id: string;
  shopDomain: string;
  shopName: string | null;
  plan: string | null;
  status: string;
  installedAt: string;
  uninstalledAt: string | null;
};

export default function CustomerTable({ customers }: { customers: Customer[] }) {
  if (customers.length === 0) {
    return (
      <div className="text-center text-zinc-500 text-sm py-16">No customers found</div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800">
            <th className="text-left text-zinc-400 font-medium pb-3 pr-4">Shop</th>
            <th className="text-left text-zinc-400 font-medium pb-3 pr-4">Plan</th>
            <th className="text-left text-zinc-400 font-medium pb-3 pr-4">Status</th>
            <th className="text-left text-zinc-400 font-medium pb-3 pr-4">Installed</th>
            <th className="text-left text-zinc-400 font-medium pb-3">Churned</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((c) => (
            <tr key={c.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20">
              <td className="py-3 pr-4">
                <p className="text-white font-medium">{c.shopName || c.shopDomain}</p>
                <p className="text-zinc-500 text-xs">{c.shopDomain}</p>
              </td>
              <td className="py-3 pr-4 text-zinc-300">{c.plan || "—"}</td>
              <td className="py-3 pr-4">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    c.status === "active"
                      ? "bg-emerald-900/40 text-emerald-400"
                      : "bg-red-900/40 text-red-400"
                  }`}
                >
                  {c.status}
                </span>
              </td>
              <td className="py-3 pr-4 text-zinc-400 text-xs">
                {formatDistanceToNow(new Date(c.installedAt), { addSuffix: true })}
              </td>
              <td className="py-3 text-zinc-400 text-xs">
                {c.uninstalledAt
                  ? formatDistanceToNow(new Date(c.uninstalledAt), { addSuffix: true })
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
