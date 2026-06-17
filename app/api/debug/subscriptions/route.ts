import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BASE_URL = `https://partners.shopify.com/${process.env.SHOPIFY_ORGANIZATION_ID}/api/2026-04/graphql.json`;
const APP_ID = `gid://partners/App/${process.env.SHOPIFY_APP_ID}`;

async function gql(query: string, variables: Record<string, unknown> = {}) {
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": process.env.SHOPIFY_PARTNER_API_TOKEN!,
    },
    body: JSON.stringify({ query, variables }),
  });
  const text = await res.text();
  if (!res.ok) return { error: `HTTP ${res.status}`, body: text };
  try {
    return JSON.parse(text);
  } catch {
    return { error: "JSON parse failed", body: text };
  }
}

export async function GET() {
  // 1. What fields does AppSubscriptionSale actually expose?
  const saleTypeIntrospect = await gql(`{
    __type(name: "AppSubscriptionSale") {
      fields { name type { name kind ofType { name kind } } }
    }
  }`);

  // 2. Does App have a subscriptions/relationships field?
  const appTypeIntrospect = await gql(`{
    __type(name: "App") {
      fields { name type { name kind ofType { name kind } } }
    }
  }`);

  // 3. Fetch one raw transaction to see actual shape coming back from API
  const rawTx = await gql(`
    query {
      transactions(appId: "${APP_ID}", first: 3) {
        edges {
          node {
            id
            createdAt
            ... on AppSubscriptionSale {
              grossAmount { amount currencyCode }
              shop { myshopifyDomain }
              billingInterval
            }
            ... on AppOneTimeSale {
              grossAmount { amount currencyCode }
              shop { myshopifyDomain }
            }
          }
        }
      }
    }
  `);

  // 4. If App has a subscriptions field, probe its type
  const appFields: string[] = (saleTypeIntrospect?.data?.__type?.fields ?? []).map(
    (f: { name: string }) => f.name
  );
  let subscriptionsIntrospect: unknown = "skipped";
  const appTypeFields: string[] = (appTypeIntrospect?.data?.__type?.fields ?? []).map(
    (f: { name: string }) => f.name
  );

  if (appTypeFields.includes("subscriptions")) {
    subscriptionsIntrospect = await gql(`
      query {
        app(id: "${APP_ID}") {
          subscriptions(first: 3) {
            edges {
              node {
                id
                name
                status
                trialDays
                currentPeriodEnd
                shop { myshopifyDomain }
              }
            }
          }
        }
      }
    `);
  } else if (appTypeFields.includes("relationships")) {
    subscriptionsIntrospect = await gql(`
      query {
        app(id: "${APP_ID}") {
          relationships(first: 3) {
            edges {
              node {
                __typename
                ... on AppSubscription {
                  id
                  name
                  status
                  trialDays
                  shop { myshopifyDomain }
                }
              }
            }
          }
        }
      }
    `);
  }

  // 5. DB state: how many transactions have billingInterval set vs null
  const [withInterval, withoutInterval, activeInstalls, planRows] = await Promise.all([
    db.transaction.count({ where: { type: "SALE", billingInterval: { not: null } } }),
    db.transaction.count({ where: { type: "SALE", billingInterval: null } }),
    db.install.count({ where: { status: "active" } }),
    db.transaction.findMany({
      where: { type: "SALE", billingInterval: { not: null } },
      orderBy: { occurredAt: "desc" },
      distinct: ["shopDomain"],
      select: { shopDomain: true, billingInterval: true, occurredAt: true, amount: true },
      take: 5,
    }),
  ]);

  // 6. Check recency: how many of those are within the billing window?
  const now = Date.now();
  const recentCount = planRows.filter((r) => {
    const daysSince = (now - r.occurredAt.getTime()) / (1000 * 60 * 60 * 24);
    return r.billingInterval === "ANNUAL" ? daysSince <= 400 : daysSince <= 37;
  }).length;

  return Response.json({
    appSaleTypeFields: appFields.length ? appFields : saleTypeIntrospect,
    appTypeFields: appTypeFields.length ? appTypeFields : appTypeIntrospect,
    rawTransactionSample: rawTx?.data?.transactions?.edges ?? rawTx,
    subscriptionsField: subscriptionsIntrospect,
    db: {
      activeInstalls,
      salesWithBillingInterval: withInterval,
      salesWithoutBillingInterval: withoutInterval,
      mostRecentPlanRowSample: planRows,
      withinBillingWindow: recentCount,
      subscribedCount: recentCount,
    },
  });
}
