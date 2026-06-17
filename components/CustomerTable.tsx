"use client";

import { formatDistanceToNow } from "date-fns";

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

type Props = {
  customers: Customer[];
  filter: string;
};

export default function CustomerTable({ customers, filter }: Props) {
  if (customers.length === 0) {
    return <div className="text-center text-zinc-500 text-sm py-16">No customers found</div>;
  }

  const showRevenue = filter === "paid";
  const showUninstalled = filter === "uninstalled" || filter === "all";

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800">
            <th className="text-left text-zinc-400 font-medium pb-3 pr-4">Shop</th>
            <th className="text-left text-zinc-400 font-medium pb-3 pr-4">Store</th>
            {showRevenue && (
              <>
                <th className="text-left text-zinc-400 font-medium pb-3 pr-4">Plan</th>
                <th className="text-left text-zinc-400 font-medium pb-3 pr-4">Revenue</th>
              </>
            )}
            <th className="text-left text-zinc-400 font-medium pb-3 pr-4">Status</th>
            <th className="text-left text-zinc-400 font-medium pb-3 pr-4">Installed</th>
            {showUninstalled && (
              <th className="text-left text-zinc-400 font-medium pb-3">Uninstalled</th>
            )}
          </tr>
        </thead>
        <tbody>
          {customers.map((c) => (
            <tr key={c.shopDomain} className="border-b border-zinc-800/50 hover:bg-zinc-800/20">
              <td className="py-3 pr-4">
                <p className="text-white font-medium">{c.shopName || c.shopDomain}</p>
                <p className="text-zinc-500 text-xs">{c.shopDomain}</p>
              </td>

              <td className="py-3 pr-4">
                <a
                  href={`https://${c.shopDomain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-400 text-xs hover:text-zinc-200 transition-colors"
                >
                  {c.shopDomain} ↗
                </a>
              </td>

              {showRevenue && (
                <>
                  <td className="py-3 pr-4">
                    {c.planLabel ? (
                      <div>
                        <span className="text-zinc-200 text-xs font-medium">{c.planLabel}</span>
                        {c.planAmount && (
                          <p className="text-zinc-500 text-xs">
                            ${c.planAmount.toFixed(2)}/
                            {c.planLabel === "Annual" ? "yr" : "mo"}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-zinc-600">—</span>
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    <span className="text-emerald-400 font-medium">
                      ${c.totalRevenue.toFixed(2)}
                    </span>
                  </td>
                </>
              )}

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

              {showUninstalled && (
                <td className="py-3 text-zinc-400 text-xs">
                  {c.uninstalledAt
                    ? formatDistanceToNow(new Date(c.uninstalledAt), { addSuffix: true })
                    : "—"}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
