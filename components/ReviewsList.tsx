"use client";

import { formatDistanceToNow } from "date-fns";

type Review = {
  id: string;
  author: string;
  rating: number;
  body: string | null;
  reviewedAt: string;
};

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-amber-400 text-sm">
      {"★".repeat(rating)}
      <span className="text-zinc-700">{"★".repeat(5 - rating)}</span>
    </span>
  );
}

export default function ReviewsList({ reviews }: { reviews: Review[] }) {
  if (reviews.length === 0) {
    return (
      <div className="text-center text-zinc-500 text-sm py-16">No reviews yet</div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((r) => (
        <div key={r.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <Stars rating={r.rating} />
              <span className="text-white text-sm font-medium">{r.author}</span>
            </div>
            <span className="text-zinc-500 text-xs">
              {formatDistanceToNow(new Date(r.reviewedAt), { addSuffix: true })}
            </span>
          </div>
          {r.body && <p className="text-zinc-400 text-sm leading-relaxed">{r.body}</p>}
        </div>
      ))}
    </div>
  );
}
