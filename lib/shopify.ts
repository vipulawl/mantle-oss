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

  if (!res.ok) throw new Error(`Partner API ${res.status}: ${await res.text()}`);

  const json = await res.json();
  if (json.errors) throw new Error(`GraphQL: ${JSON.stringify(json.errors)}`);
  return json.data;
}

// --- Installs via app.events ---

type AppEvent = {
  type: string;
  occurredAt: string;
  shop: { myshopifyDomain: string; name: string };
};

export type ShopInstallState = {
  shopDomain: string;
  shopName: string;
  status: "active" | "churned";
  installedAt: Date;
  uninstalledAt: Date | null;
};

const EVENTS_QUERY = `
  query AppEvents($appId: ID!, $after: String) {
    app(id: $appId) {
      events(first: 100, after: $after) {
        pageInfo { hasNextPage endCursor }
        edges {
          node {
            type
            occurredAt
            shop { myshopifyDomain name }
          }
        }
      }
    }
  }
`;

export async function fetchAllInstalls(): Promise<ShopInstallState[]> {
  const events: AppEvent[] = [];
  let after: string | null = null;

  do {
    const data = await gql(EVENTS_QUERY, { appId: APP_ID, after });
    const page = data.app.events;
    const relevant = page.edges
      .map((e: { node: AppEvent }) => e.node)
      .filter((e: AppEvent) =>
        e.type === "RELATIONSHIP_INSTALLED" || e.type === "RELATIONSHIP_UNINSTALLED"
      );
    events.push(...relevant);
    after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (after);

  // Reconstruct per-shop current state from full event history
  const byShop = new Map<string, { events: AppEvent[]; shopName: string }>();
  for (const event of events) {
    const domain = event.shop.myshopifyDomain;
    if (!byShop.has(domain)) byShop.set(domain, { events: [], shopName: event.shop.name });
    byShop.get(domain)!.events.push(event);
  }

  const result: ShopInstallState[] = [];
  for (const [shopDomain, { events: shopEvents, shopName }] of byShop) {
    shopEvents.sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());

    const firstInstall = shopEvents.find((e) => e.type === "RELATIONSHIP_INSTALLED");
    const lastEvent = shopEvents[shopEvents.length - 1];
    const lastUninstall = [...shopEvents].reverse().find((e) => e.type === "RELATIONSHIP_UNINSTALLED");

    const status: "active" | "churned" =
      lastEvent.type === "RELATIONSHIP_INSTALLED" ? "active" : "churned";

    result.push({
      shopDomain,
      shopName,
      status,
      installedAt: new Date(firstInstall?.occurredAt ?? lastEvent.occurredAt),
      uninstalledAt: status === "churned" && lastUninstall ? new Date(lastUninstall.occurredAt) : null,
    });
  }

  return result;
}

// --- Transactions ---

export type PartnerTransaction = {
  id: string;
  createdAt: string;
  // populated via inline fragments
  grossAmount?: { amount: string; currencyCode: string };
  shop?: { myshopifyDomain: string };
};

const TRANSACTIONS_QUERY = `
  query AppTransactions($appId: ID!, $after: String) {
    transactions(appId: $appId, first: 100, after: $after) {
      pageInfo { hasNextPage endCursor }
      edges {
        node {
          id
          createdAt
          ... on AppSubscriptionSale {
            grossAmount { amount currencyCode }
            shop { myshopifyDomain }
          }
          ... on AppSubscriptionRefund {
            grossAmount { amount currencyCode }
            shop { myshopifyDomain }
          }
          ... on AppOneTimeSale {
            grossAmount { amount currencyCode }
            shop { myshopifyDomain }
          }
        }
      }
    }
  }
`;

export async function fetchAllTransactions(): Promise<PartnerTransaction[]> {
  const results: PartnerTransaction[] = [];
  let after: string | null = null;

  do {
    const data = await gql(TRANSACTIONS_QUERY, { appId: APP_ID, after });
    const page = data.transactions;
    // Only keep nodes that have grossAmount (i.e. matched a known inline fragment)
    const nodes = page.edges
      .map((e: { node: PartnerTransaction }) => e.node)
      .filter((n: PartnerTransaction) => n.grossAmount);
    results.push(...nodes);
    after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (after);

  return results;
}
