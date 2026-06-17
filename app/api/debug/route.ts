import { db } from "@/lib/db";
import { fetchAllInstalls, fetchAllTransactions } from "@/lib/shopify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const [installCount, txCount, reviewCount] = await Promise.all([
    db.install.count(),
    db.transaction.count(),
    db.review.count(),
  ]);

  let installSample: unknown = null;
  let txSample: unknown = null;

  try { installSample = (await fetchAllInstalls()).slice(0, 2); } catch (e) { installSample = String(e); }
  try { txSample = (await fetchAllTransactions()).slice(0, 2); } catch (e) { txSample = String(e); }

  return Response.json({
    db: { installs: installCount, transactions: txCount, reviews: reviewCount },
    installSample,
    txSample,
  });
}
