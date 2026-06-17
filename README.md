# mantle-oss

Open-source alternative to HeyMantle. Track your Shopify app's revenue, customers, churn, and reviews — all from your local machine. No infra to manage.

## What it does

- **Revenue** — MRR, total earnings, refunds, revenue over time
- **Customers** — all installs with plan, shop domain, install date, and status
- **Churn** — uninstall tracking and churn rate over time
- **Reviews** — App Store reviews with ratings, synced automatically
- **Near real-time** — Shopify Partner API polled every 2 minutes, reviews every 30 min
- **Live dashboard** — updates pushed to browser via Server-Sent Events (no manual refresh)

## Requirements

- Node.js 18+
- A Shopify Partner account with an app
- Shopify Partner API access token

## Setup

### 1. Clone and install

```bash
git clone https://github.com/your-username/mantle-oss
cd mantle-oss
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in the four values below. Here's exactly where to find each one:

---

#### `SHOPIFY_PARTNER_API_TOKEN`

1. Go to [partners.shopify.com](https://partners.shopify.com)
2. Click **Settings** in the left sidebar
3. Click **Partner API clients**
4. Click **Create API client**, give it a name (e.g. `mantle-oss`)
5. Copy the access token shown — **you won't be able to see it again**

> The token needs no special scopes selected. It gets read access to your org's apps by default.

---

#### `SHOPIFY_ORGANIZATION_ID`

Look at the URL after you log in to the Partners dashboard:

```
https://partners.shopify.com/1234567/apps
                              ^^^^^^^
                         this is your org ID
```

It's the number between `partners.shopify.com/` and `/apps` (or `/settings`, etc.).

---

#### `SHOPIFY_APP_ID`

1. In the Partners dashboard, click **Apps** in the sidebar
2. Click on your app
3. Look at the URL:

```
https://partners.shopify.com/1234567/apps/9876543/overview
                                          ^^^^^^^
                                      this is your app ID
```

It's the number after `/apps/`.

---

#### `SHOPIFY_APP_HANDLE`

This is the slug in your Shopify App Store listing URL:

```
https://apps.shopify.com/your-app-name
                          ^^^^^^^^^^^^^
                         this is your handle
```

If your app isn't listed on the App Store yet, you can leave this blank — only the Reviews page will be empty.

---

Your final `.env` should look like:

```
DATABASE_URL="file:./dev.db"

SHOPIFY_PARTNER_API_TOKEN=shppa_abc123...
SHOPIFY_ORGANIZATION_ID=1234567
SHOPIFY_APP_ID=9876543
SHOPIFY_APP_HANDLE=your-app-name
```

### 3. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

On first run, the app will sync all historical data from the Partner API. This may take 30–60 seconds depending on how many installs/transactions you have.

## How it works

```
Shopify Partner API (GraphQL)
        ↓  every 2 minutes
   Background worker (node-cron)
        ↓
   SQLite database (prisma/dev.db)
        ↓  Server-Sent Events
   Next.js dashboard (localhost:3000)
```

Reviews are scraped from the Shopify App Store page every 30 minutes.

## File structure

```
mantle-oss/
├── app/
│   ├── page.tsx               # Overview dashboard
│   ├── customers/page.tsx     # Customer list
│   ├── revenue/page.tsx       # Revenue charts
│   ├── reviews/page.tsx       # App Store reviews
│   └── api/
│       ├── events/route.ts    # SSE endpoint for live updates
│       ├── sync/route.ts      # Manual sync trigger
│       ├── overview/route.ts
│       ├── customers/route.ts
│       ├── revenue/route.ts
│       └── reviews/route.ts
├── components/
│   ├── KPICard.tsx
│   ├── RevenueChart.tsx
│   ├── CustomerTable.tsx
│   ├── ReviewsList.tsx
│   └── Sidebar.tsx
├── lib/
│   ├── shopify.ts             # Partner API GraphQL client
│   ├── scraper.ts             # App Store review scraper
│   ├── db.ts                  # Prisma client singleton
│   └── metrics.ts             # MRR, churn rate calculations
├── workers/
│   └── sync.ts                # Cron job definitions
├── instrumentation.ts         # Starts workers when server boots
├── prisma/
│   └── schema.prisma
├── .env.example
└── README.md
```

## CLI flags / env vars

| Variable | Required | Description |
|---|---|---|
| `SHOPIFY_PARTNER_API_TOKEN` | Yes | Partner API access token |
| `SHOPIFY_ORGANIZATION_ID` | Yes | Your Partner org numeric ID |
| `SHOPIFY_APP_ID` | Yes | Numeric app ID |
| `SHOPIFY_APP_HANDLE` | Yes | App Store URL slug |
| `SYNC_INTERVAL_MINUTES` | No | Override 2-min sync interval (default: 2) |
| `REVIEWS_INTERVAL_MINUTES` | No | Override 30-min review sync interval (default: 30) |

## Cost / API usage

- Shopify Partner API is **free** with no published rate limits — 2-minute polling is conservative and safe
- Review scraping hits the public App Store page — no API key needed, no cost
- SQLite means **zero database costs**

## Contributing

PRs welcome. Open an issue first for large changes.
