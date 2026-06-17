# mantle-oss

Open-source, self-hosted alternative to HeyMantle. Track your Shopify app's MRR, customers, churn, reviews, and subscription events — all from your local machine. No infra, no SaaS fees.

## What it does

| Feature | Details |
|---|---|
| **MRR** | Current monthly recurring revenue based on active subscribers; annual plans normalised to /12 |
| **Customers** | Paid / Installed / Uninstalled / All tabs with search and CSV export |
| **Churn tracking** | Uninstall events, churn rate, monthly installs vs churn bar chart |
| **App events** | Full audit log of all 21 Shopify Partner API event types per store |
| **Reviews** | App Store reviews with ratings, scraped every 30 minutes |
| **Near real-time** | Partner API polled every 2 minutes; browser updated live via SSE |

### Dashboard pages

- **Overview** — KPI cards (MRR, active customers, churn rate, avg rating) + three charts with a global 3M / 6M / 1Y / All range toggle
  - MRR by month (area chart)
  - Daily revenue (area chart)
  - Installs & churn by month (grouped bar chart)
- **Customers** — Paid / Installed / Uninstalled / All tabs. Paid tab uses subscription events (not guesswork) to show only stores with an active plan. Plan, revenue, store link, install date shown per row. Export any tab to CSV.
- **Reviews** — App Store reviews with star ratings and full review text
- **App events** — Chronological audit log for every store. Filter by event category (Relationship, Subscription, One-time, Credits) or individual event type.

### Subscription accuracy

Paid status is determined by the Shopify Partner API's own subscription charge events — `SUBSCRIPTION_CHARGE_ACTIVATED` means currently subscribed; `SUBSCRIPTION_CHARGE_CANCELED` / `SUBSCRIPTION_CHARGE_EXPIRED` means lapsed. This is more accurate than guessing from transaction recency.

> **Note:** Stores on a free trial or mid-cycle before their first charge are not visible — the Partner API only records completed payments, not pending or trial subscriptions.

---

## Requirements

- Node.js 18+
- A Shopify Partner account with an app

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/vipulawl/mantle-oss
cd mantle-oss
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with the four values below.

---

#### `SHOPIFY_PARTNER_API_TOKEN`

1. Go to [partners.shopify.com](https://partners.shopify.com)
2. Click **Settings** → **Partner API clients**
3. Click **Create API client**, give it a name (e.g. `mantle-oss`)
4. Copy the access token — **you won't be able to see it again**

> No special scopes needed — it gets read access to your org's apps by default.

---

#### `SHOPIFY_ORGANIZATION_ID`

Look at the URL after logging in to the Partners dashboard:

```
https://partners.shopify.com/1234567/apps
                              ^^^^^^^
                         this is your org ID
```

---

#### `SHOPIFY_APP_ID`

1. In the Partners dashboard, click **Apps**
2. Click on your app
3. Look at the URL:

```
https://partners.shopify.com/1234567/apps/9876543/overview
                                          ^^^^^^^
                                      this is your app ID
```

---

#### `SHOPIFY_APP_HANDLE`

The slug in your App Store listing URL:

```
https://apps.shopify.com/your-app-name
                          ^^^^^^^^^^^^^
```

Leave blank if your app isn't publicly listed — only the Reviews page will be empty.

---

Your final `.env`:

```
DATABASE_URL="file:./dev.db"

SHOPIFY_PARTNER_API_TOKEN=shppa_abc123...
SHOPIFY_ORGANIZATION_ID=1234567
SHOPIFY_APP_ID=9876543
SHOPIFY_APP_HANDLE=your-app-name
```

### 3. Set up the database

```bash
npx prisma migrate dev
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

On first boot the app syncs all historical data from the Partner API. Depending on install/transaction volume this takes 30–60 seconds. Watch the terminal for sync progress.

---

## How it works

```
Shopify Partner API (GraphQL 2026-04)
        ↓  every 2 minutes
   Background worker (node-cron via instrumentation.ts)
        ↓
   SQLite database (prisma/dev.db)
        ↓  Server-Sent Events
   Next.js dashboard (localhost:3000)

Shopify App Store (public HTML)
        ↓  every 30 minutes (scraper)
   SQLite → Reviews page
```

All data is stored locally in a single SQLite file (`prisma/dev.db`). There is no external database.

---

## File structure

```
mantle-oss/
├── app/
│   ├── page.tsx                      # Overview dashboard with charts
│   ├── customers/page.tsx            # Customer tabs with CSV export
│   ├── reviews/page.tsx              # App Store reviews
│   ├── activity/page.tsx             # App events audit log
│   └── api/
│       ├── events/route.ts           # SSE endpoint (live browser updates)
│       ├── sync/route.ts             # Manual sync trigger (POST)
│       ├── overview/route.ts
│       ├── customers/route.ts
│       ├── revenue/route.ts
│       ├── activity/route.ts
│       └── debug/
│           ├── route.ts              # DB counts + review scrape test
│           └── subscriptions/route.ts # Partner API schema introspection
├── components/
│   ├── KPICard.tsx
│   ├── RevenueChart.tsx
│   ├── CustomerTable.tsx
│   ├── ReviewsList.tsx
│   └── Sidebar.tsx
├── lib/
│   ├── shopify.ts                    # Partner API GraphQL client + pagination
│   ├── scraper.ts                    # App Store review scraper (cheerio)
│   ├── db.ts                         # Prisma singleton (fixes SQLite path on dev)
│   ├── metrics.ts                    # MRR, churn rate, chart data functions
│   └── apiFetch.ts                   # Shared fetch helper with error logging
├── workers/
│   └── sync.ts                       # syncInstalls / syncTransactions / syncReviews
├── instrumentation.ts                # Starts workers on server boot (Next.js hook)
├── prisma/
│   ├── schema.prisma
│   └── dev.db                        # SQLite file (gitignored)
├── .env.example
└── README.md
```

---

## Data model

| Table | What it stores |
|---|---|
| `Install` | One row per shop — domain, name, status (active/churned), install/uninstall dates |
| `Transaction` | Every billing charge — amount, currency, billing interval, occurred date |
| `AppEvent` | Every Partner API event per shop — install, uninstall, subscription started/cancelled/frozen, one-time charges, credits |
| `Review` | App Store reviews — author, rating, body, date |
| `SyncMeta` | Timestamps of last successful sync per data type |

### AppEvent types captured

**Relationship:** `INSTALLED` · `UNINSTALLED` · `REACTIVATED` · `DEACTIVATED`

**Subscription:** `CHARGE_ACTIVATED` · `CHARGE_ACCEPTED` · `CHARGE_CANCELED` · `CHARGE_DECLINED` · `CHARGE_EXPIRED` · `CHARGE_FROZEN` · `CHARGE_UNFROZEN` · `CAPPED_AMOUNT_UPDATED` · `APPROACHING_CAPPED_AMOUNT`

**One-time:** `ONE_TIME_CHARGE_ACTIVATED` · `ACCEPTED` · `DECLINED` · `EXPIRED`

**Credits / Usage:** `CREDIT_APPLIED` · `CREDIT_FAILED` · `CREDIT_PENDING` · `USAGE_CHARGE_APPLIED`

---

## Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `SHOPIFY_PARTNER_API_TOKEN` | Yes | — | Partner API access token |
| `SHOPIFY_ORGANIZATION_ID` | Yes | — | Your Partner org numeric ID |
| `SHOPIFY_APP_ID` | Yes | — | Numeric app ID |
| `SHOPIFY_APP_HANDLE` | Yes | — | App Store URL slug (for review scraping) |
| `DATABASE_URL` | Yes | `file:./dev.db` | SQLite file path (set in `.env`) |
| `SYNC_INTERVAL_MINUTES` | No | `2` | How often to poll installs + transactions |
| `REVIEWS_INTERVAL_MINUTES` | No | `30` | How often to scrape App Store reviews |

---

## Cost / API usage

- **Shopify Partner API** — free, no published rate limits; 2-minute polling is conservative
- **Review scraping** — hits the public App Store page, no API key or cost
- **SQLite** — zero database costs, single file on your machine

---

## Known limitations

- **Free trials invisible** — the Partner API only records completed charges, not active trials or pending subscriptions
- **No store contact email** — the Partner API's `Shop` type only exposes domain and name; email requires per-store OAuth tokens
- **Plan names** — Shopify only reports billing interval (monthly/annual) and amount, not the human-readable plan name you set in your app

---

## Contributing

PRs welcome. Open an issue first for large changes.
