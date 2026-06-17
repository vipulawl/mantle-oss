import { syncInstalls, syncTransactions, syncReviews } from "@/workers/sync";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { type } = await req.json().catch(() => ({ type: "all" }));

  if (type === "reviews") {
    await syncReviews();
  } else {
    await Promise.all([syncInstalls(), syncTransactions()]);
    if (type === "all") await syncReviews();
  }

  return Response.json({ ok: true });
}
