"use client";

import { useState, useEffect, useCallback } from "react";
import ReviewsList from "@/components/ReviewsList";
import { useSyncEvents } from "@/hooks/useSyncEvents";
import { apiFetch } from "@/lib/apiFetch";

type ReviewData = {
  reviews: {
    id: string;
    author: string;
    rating: number;
    body: string | null;
    reviewedAt: string;
  }[];
  ratingBreakdown: { rating: number; _count: { rating: number } }[];
};

export default function ReviewsPage() {
  const [data, setData] = useState<ReviewData | null>(null);
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const params = new URLSearchParams();
    if (filterRating !== null) params.set("rating", String(filterRating));
    const res = await apiFetch<ReviewData>(`/api/reviews?${params}`);
    if (res) { setData(res); setError(null); }
    else setError("API error — check terminal");
  }, [filterRating]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useSyncEvents((event) => {
    if (event.type === "reviews") fetchData();
  });

  const avgRating =
    data?.reviews && data.reviews.length > 0
      ? data.reviews.reduce((s, r) => s + r.rating, 0) / data.reviews.length
      : 0;

  return (
    <div className="p-8">
      <h1 className="text-xl font-semibold text-white mb-6">Reviews</h1>

      {error && (
        <div className="mb-4 bg-red-900/30 border border-red-800 rounded-lg px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-zinc-400 text-xs uppercase tracking-wider mb-1">Avg Rating</p>
          <p className="text-white text-2xl font-semibold">
            {avgRating ? avgRating.toFixed(1) : "—"}
            <span className="text-amber-400 text-lg ml-1">★</span>
          </p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-zinc-400 text-xs uppercase tracking-wider mb-1">Total Reviews</p>
          <p className="text-white text-2xl font-semibold">
            {data?.reviews.length ?? "—"}
          </p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 col-span-2 lg:col-span-1">
          <p className="text-zinc-400 text-xs uppercase tracking-wider mb-2">Breakdown</p>
          <div className="space-y-1">
            {[5, 4, 3, 2, 1].map((star) => {
              const count =
                data?.ratingBreakdown.find((b) => b.rating === star)?._count.rating ?? 0;
              const total = data?.reviews.length || 1;
              return (
                <div key={star} className="flex items-center gap-2 text-xs">
                  <span className="text-amber-400 w-3">{star}</span>
                  <div className="flex-1 bg-zinc-800 rounded-full h-1.5">
                    <div
                      className="bg-amber-400 h-1.5 rounded-full"
                      style={{ width: `${(count / total) * 100}%` }}
                    />
                  </div>
                  <span className="text-zinc-500 w-4">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1 w-fit mb-4">
        <button
          onClick={() => setFilterRating(null)}
          className={`px-3 py-1 rounded-md text-sm transition-colors ${
            filterRating === null ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-white"
          }`}
        >
          All
        </button>
        {[5, 4, 3, 2, 1].map((star) => (
          <button
            key={star}
            onClick={() => setFilterRating(star)}
            className={`px-3 py-1 rounded-md text-sm transition-colors ${
              filterRating === star
                ? "bg-zinc-700 text-white"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            {star}★
          </button>
        ))}
      </div>

      <ReviewsList reviews={data?.reviews ?? []} />
    </div>
  );
}
