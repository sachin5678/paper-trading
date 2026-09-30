# Bazar Paper

A paper-trading terminal for NSE and BSE index options (F&O) — NIFTY, BANKNIFTY and
SENSEX. Every account starts with ₹20,00,000 in virtual capital; every fill is
simulated. See [PLAN.md](PLAN.md) for the full design rationale and project status.

## Stack

Vite + React + TypeScript + Tailwind v4, client-side state via Zustand
(`localStorage`-persisted). A small set of Vercel Serverless Functions under `api/`
source a live NIFTY/BANKNIFTY/SENSEX option chain from Upstox, falling back to a
seeded simulator whenever the live feed isn't available.

## Local development

```bash
npm install
cp .env.example .env   # fill in Upstox credentials — see below
npm run dev
```

`npm run dev` runs the Vite frontend and a local stand-in for the `/api` serverless
functions together (`scripts/dev-api-server.ts`), so the whole app works locally
with no Vercel CLI or account needed. Vite proxies `/api/*` to it.

### Connecting a live feed (optional)

The app works fully simulated with no setup. To source real prices:

1. Register a Upstox Developer app at <https://upstox.com/developer/apps>, with
   redirect URL `http://localhost:5173/api/broker/upstox/callback` for local dev.
2. Fill `UPSTOX_CLIENT_ID`, `UPSTOX_CLIENT_SECRET`, `ADMIN_SECRET` and
   `TOKEN_ENCRYPTION_KEY` in `.env` (see `.env.example` for what each is for and
   how to generate them).
3. Run the app, open `/app/admin/broker`, enter your admin secret, and connect.

Upstox tokens expire daily (~3:30am IST) — reconnect from that same page each
trading day. Without a KV integration configured (`KV_REST_API_URL`), the token is
stored locally in a gitignored `.local-data/` file, which is fine for local/single-
instance use but won't work across multiple serverless instances in production —
add the Vercel KV integration before relying on this in a real deployment.

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Frontend + local API stand-in together |
| `npm run dev:web` | Frontend only |
| `npm run dev:api` | Local API stand-in only |
| `npm run build` | Typecheck + production build |
| `npm run lint` | Oxlint |
