const BASE_URL = `https://partners.shopify.com/${process.env.SHOPIFY_ORGANIZATION_ID}/api/2024-10/graphql.json`;
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

  if (!res.ok) {
    throw new Error(`Partner API error: ${res.status} ${await res.text()}`);
  }

  const json = await res.json();
  if (json.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(json.errors)}`);
  }
  return json.data;
}

export type PartnerInstall = {
  id: string;
  installedAt: string;
  uninstalledAt: string | null;
  shop: { myshopifyDomain: string; name: string };
  activeSubscriptions: { name: string }[];
};

export type PartnerTransaction = {
  id: string;
  createdAt: string;
  grossAmount: { amount: string; currencyCode: string };
  netAmount: { amount: string; currencyCode: string };
  shop: { myshopifyDomain: string };
  billingInterval?: string;
  name?: string;
  type: string;
};

const INSTALLS_QUERY = `
  query AppInstalls($appId: ID!, $after: String) {
    app(id: $appId) {
      installations(first: 100, after: $after) {
        pageInfo { hasNextPage endCursor }
        edges {
          node {
            id
            installedAt
            uninstalledAt
            shop { myshopifyDomain name }
            activeSubscriptions { name }
          }
        }
      }
    }
  }
`;

const TRANSACTIONS_QUERY = `
  query AppTransactions($appId: ID!, $after: String) {
    transactions(
      appId: $appId
      first: 100
      after: $after
      types: [APP_SUBSCRIPTION_SALE, APP_SUBSCRIPTION_REFUND, APP_ONE_TIME_SALE, THEME_PURCHASE_SALE, APP_USAGE_SALE]
    ) {
      pageInfo { hasNextPage endCursor }
      edges {
        node {
          id
          createdAt
          grossAmount { amount currencyCode }
          shop { myshopifyDomain }
          ... on AppSubscriptionSale {
            appSubscription { name billingInterval }
          }
          ... on AppSubscriptionRefund {
            appSubscription { name }
          }
        }
      }
    }
  }
`;

export async function fetchAllInstalls(): Promise<PartnerInstall[]> {
  const results: PartnerInstall[] = [];
  let after: string | null = null;

  do {
    const data = await gql(INSTALLS_QUERY, { appId: APP_ID, after });
    const page = data.app.installations;
    results.push(...page.edges.map((e: { node: PartnerInstall }) => e.node));
    after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (after);

  return results;
}

export async function fetchAllTransactions(): Promise<PartnerTransaction[]> {
  const results: PartnerTransaction[] = [];
  let after: string | null = null;

  do {
    const data = await gql(TRANSACTIONS_QUERY, { appId: APP_ID, after });
    const page = data.transactions;
    results.push(...page.edges.map((e: { node: PartnerTransaction }) => e.node));
    after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (after);

  return results;
}
