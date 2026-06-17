"use client";

import { useState, useEffect, useCallback } from "react";
import { formatDistanceToNow, format } from "date-fns";
import { useSyncEvents } from "@/hooks/useSyncEvents";
import { apiFetch } from "@/lib/apiFetch";

type AppEvent = {
  id: string;
  shopDomain: string;
  shopName: string | null;
  type: string;
  occurredAt: string;
};

const EVENT_META: Record<string, { label: string; badge: string }> = {
  RELATIONSHIP_INSTALLED:                 { label: "Installed",              badge: "bg-emerald-900/60 text-emerald-300" },
  RELATIONSHIP_UNINSTALLED:               { label: "Uninstalled",            badge: "bg-red-900/60 text-red-300" },
  RELATIONSHIP_REACTIVATED:               { label: "Reactivated",            badge: "bg-blue-900/60 text-blue-300" },
  RELATIONSHIP_DEACTIVATED:               { label: "Deactivated",            badge: "bg-orange-900/60 text-orange-300" },
  SUBSCRIPTION_CHARGE_ACTIVATED:          { label: "Sub Started",            badge: "bg-emerald-900/60 text-emerald-300" },
  SUBSCRIPTION_CHARGE_ACCEPTED:           { label: "Sub Accepted",           badge: "bg-emerald-900/60 text-emerald-200" },
  SUBSCRIPTION_CHARGE_CANCELED:           { label: "Sub Cancelled",          badge: "bg-red-900/60 text-red-300" },
  SUBSCRIPTION_CHARGE_DECLINED:           { label: "Sub Declined",           badge: "bg-red-900/60 text-red-200" },
  SUBSCRIPTION_CHARGE_EXPIRED:            { label: "Sub Expired",            badge: "bg-zinc-700 text-zinc-300" },
  SUBSCRIPTION_CHARGE_FROZEN:             { label: "Sub Frozen",             badge: "bg-yellow-900/60 text-yellow-300" },
  SUBSCRIPTION_CHARGE_UNFROZEN:           { label: "Sub Unfrozen",           badge: "bg-blue-900/60 text-blue-300" },
  SUBSCRIPTION_CAPPED_AMOUNT_UPDATED:     { label: "Cap Updated",            badge: "bg-zinc-700 text-zinc-300" },
  SUBSCRIPTION_APPROACHING_CAPPED_AMOUNT: { label: "Approaching Cap",        badge: "bg-yellow-900/60 text-yellow-300" },
  ONE_TIME_CHARGE_ACTIVATED:              { label: "One-time Purchase",      badge: "bg-purple-900/60 text-purple-300" },
  ONE_TIME_CHARGE_ACCEPTED:              { label: "Charge Accepted",         badge: "bg-purple-900/60 text-purple-200" },
  ONE_TIME_CHARGE_DECLINED:              { label: "Charge Declined",         badge: "bg-red-900/60 text-red-200" },
  ONE_TIME_CHARGE_EXPIRED:               { label: "Charge Expired",          badge: "bg-zinc-700 text-zinc-300" },
  CREDIT_APPLIED:                        { label: "Credit Applied",          badge: "bg-emerald-900/60 text-emerald-200" },
  CREDIT_FAILED:                         { label: "Credit Failed",           badge: "bg-red-900/60 text-red-200" },
  CREDIT_PENDING:                        { label: "Credit Pending",          badge: "bg-yellow-900/60 text-yellow-200" },
  USAGE_CHARGE_APPLIED:                  { label: "Usage Charge",            badge: "bg-blue-900/60 text-blue-200" },
};

const EVENT_GROUPS = [
  { label: "Relationship", types: ["RELATIONSHIP_INSTALLED", "RELATIONSHIP_UNINSTALLED", "RELATIONSHIP_REACTIVATED", "RELATIONSHIP_DEACTIVATED"] },
  { label: "Subscription", types: ["SUBSCRIPTION_CHARGE_ACTIVATED", "SUBSCRIPTION_CHARGE_ACCEPTED", "SUBSCRIPTION_CHARGE_CANCELED", "SUBSCRIPTION_CHARGE_DECLINED", "SUBSCRIPTION_CHARGE_EXPIRED", "SUBSCRIPTION_CHARGE_FROZEN", "SUBSCRIPTION_CHARGE_UNFROZEN"] },
  { label: "One-time", types: ["ONE_TIME_CHARGE_ACTIVATED", "ONE_TIME_CHARGE_ACCEPTED", "ONE_TIME_CHARGE_DECLINED", "ONE_TIME_CHARGE_EXPIRED"] },
  { label: "Credits", types: ["CREDIT_APPLIED", "CREDIT_FAILED", "CREDIT_PENDING", "USAGE_CHARGE_APPLIED"] },
];

function EventBadge({ type }: { type: string }) {
  const meta = EVENT_META[type] ?? { label: type, badge: "bg-zinc-700 text-zinc-300" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${meta.badge}`}>
      {meta.label}
    </span>
  );
}

export default function ActivityPage() {
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [search, setSearch] = useState("");
  const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (activeTypes.size > 0) params.set("types", [...activeTypes].join(","));
    const data = await apiFetch<AppEvent[]>(`/api/activity?${params}`);
    if (data) { setEvents(data); setError(null); }
    else setError("Failed to load activity — check terminal");
  }, [search, activeTypes]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  useSyncEvents((event) => {
    if (event.type === "installs") fetchEvents();
  });

  function toggleType(type: string) {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  function toggleGroup(types: string[]) {
    const allActive = types.every((t) => activeTypes.has(t));
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (allActive) types.forEach((t) => next.delete(t));
      else types.forEach((t) => next.add(t));
      return next;
    });
  }

  const grouped: { date: string; items: AppEvent[] }[] = [];
  for (const event of events) {
    const date = format(new Date(event.occurredAt), "MMMM d, yyyy");
    const last = grouped[grouped.length - 1];
    if (last && last.date === date) last.items.push(event);
    else grouped.push({ date, items: [event] });
  }

  return (
    <div className="p-8">
      <h1 className="text-xl font-semibold text-white mb-6">Activity</h1>

      {error && (
        <div className="mb-4 bg-red-900/30 border border-red-800 rounded-lg px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-4 mb-6">
        <input
          type="text"
          placeholder="Search by domain or name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 rounded-lg px-3 py-2 text-sm max-w-xs focus:outline-none focus:border-zinc-500"
        />

        <div className="flex flex-col gap-2.5">
          {EVENT_GROUPS.map((group) => {
            const allOn = group.types.every((t) => activeTypes.has(t));
            return (
              <div key={group.label} className="flex items-start gap-3">
                <button
                  onClick={() => toggleGroup(group.types)}
                  className={`text-xs w-20 text-right shrink-0 pt-0.5 transition-colors ${
                    allOn ? "text-white" : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {group.label}
                </button>
                <div className="flex flex-wrap gap-1.5">
                  {group.types.map((type) => {
                    const meta = EVENT_META[type] ?? { label: type, badge: "bg-zinc-700 text-zinc-300" };
                    const on = activeTypes.has(type);
                    return (
                      <button
                        key={type}
                        onClick={() => toggleType(type)}
                        className={`text-xs px-2 py-0.5 rounded-full transition-colors ${
                          on
                            ? meta.badge
                            : "border border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-500"
                        }`}
                      >
                        {meta.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {activeTypes.size > 0 && (
            <div className="flex items-start gap-3">
              <div className="w-20" />
              <button
                onClick={() => setActiveTypes(new Set())}
                className="text-xs text-zinc-500 hover:text-white transition-colors"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <p className="text-zinc-500 text-xs mb-5">{events.length} events</p>

        {events.length === 0 ? (
          <div className="text-center text-zinc-500 text-sm py-16">No events found</div>
        ) : (
          <div className="space-y-6">
            {grouped.map(({ date, items }) => (
              <div key={date}>
                <p className="text-zinc-600 text-xs font-medium uppercase tracking-wider mb-3">{date}</p>
                <div className="space-y-0">
                  {items.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center gap-4 py-2.5 border-b border-zinc-800/50 hover:bg-zinc-800/20 -mx-2 px-2 rounded"
                    >
                      <div className="w-16 text-zinc-600 text-xs shrink-0">
                        {format(new Date(event.occurredAt), "HH:mm")}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">
                          {event.shopName || event.shopDomain}
                        </p>
                        <p className="text-zinc-500 text-xs truncate">{event.shopDomain}</p>
                      </div>
                      <div className="shrink-0">
                        <EventBadge type={event.type} />
                      </div>
                      <div className="text-zinc-600 text-xs shrink-0 w-24 text-right">
                        {formatDistanceToNow(new Date(event.occurredAt), { addSuffix: true })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
