import { db } from "@/lib/db";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const search = searchParams.get("q");

  const customers = await db.install.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { shopDomain: { contains: search } },
              { shopName: { contains: search } },
            ],
          }
        : {}),
    },
    orderBy: { installedAt: "desc" },
  });

  return Response.json(customers);
}
