# Paisa Paper — NSE/BSE options paper-trading terminal

## Status: Phase A (live Upstox feed) — done and connected

The option chain page now shows a real live NIFTY/BANKNIFTY/SENSEX chain (`FeedBadge`
reads **Live**), falling back to the original simulator whenever the feed can't be
reached. You've registered a Upstox Developer app and connected it via
`/app/admin/broker` — confirmed working end-to-end against your real account.

Two real-world corrections made while wiring this up, worth remembering:
- Upstox's documented `current_week`/`current_month` expiry keywords returned an
  empty chain for NIFTY on this account. Fixed by resolving the actual nearest
  expiry from Upstox's own contracts list (`resolveContractInfo` in
  `api/_lib/upstox.ts`) instead of trusting a keyword.
- NIFTY's weekly expiry day is **Tuesday**, not the Thursday this app originally
  assumed (NSE has changed this more than once) — fixed in both the live resolver
  and the simulated fallback's `upcomingExpiries()` in `src/lib/marketData.ts`.
- Lot size is also pulled live (65 for NIFTY as of this account's data, not the
  simulated-mode static 25) so order-ticket math stays correct in live mode — see
  `lotSize` threaded through `OptionChainResponse` → `OptionChain.tsx`.
- Upstox's option chain returns every listed strike (138 for NIFTY, out to deep
  OTM strikes nobody trades) — windowed to ~25 near the money server-side
  (`windowAroundAtm` in `api/_lib/upstox.ts`) to match the simulated table's scale.

Live mode is scoped to the nearest expiry only (the option chain page's first tab);
the other two tabs stay simulated-only for this phase. All three underlyings are
confirmed working live against the real account: NIFTY (lot 65, expiry Tue),
BANKNIFTY (lot 30, expiry Tue), SENSEX (lot 20, expiry Thu) — architecture is
underlying-agnostic, so no separate work was needed per instrument.

Full architecture detail in `.claude/plans/declarative-zooming-blossom.md`.

Not built yet, by design (see that plan doc's "Phase B candidates"): Kotak Neo,
per-visitor broker linking, and server-persisted multi-user accounts.

## What this is

A practice trading terminal for NSE and BSE index/stock **options (F&O)**. Users get
₹10,00,000 in virtual capital, a live-feeling option chain for NIFTY, BANKNIFTY and
SENSEX, and can place simulated buy/sell orders that mark-to-market against a
simulated price feed. No real money, no real broker connection, no real market data —
everything is client-side and clearly labeled "simulated."

## Design direction

Most AI-generated fintech dashboards converge on the same look: slate-900 background,
green call-to-action, Inter/generic-sans everywhere. We deliberately did not build that.

The reference point instead is the **physical exchange ticker board** — the thing that
is actually characteristic of NSE and BSE, not a generic SaaS dashboard. That gives us:

- **Color** — near-black background (`#05070c`), phosphor amber (`#ffb020`) as the *only*
  interface/brand accent (nav, CTAs, focus, ATM strike highlight), with green/red reserved
  *exclusively* for market semantics (gain/loss, calls/puts), and one violet (`#8b7bff`)
  reserved *exclusively* for "this is simulated" signage — so a trader never confuses
  practice-mode chrome with live data.
- **Type** — IBM Plex Sans for UI chrome/labels, IBM Plex Mono for every number (prices,
  P&L, the option chain grid, the ticker). Tabular figures throughout.
- **Signature element** — a live ticker ribbon (NIFTY/SENSEX/BANKNIFTY) across the top of
  every screen, and the option chain itself used as the landing page's hero visual instead
  of a generic stat-card hero, since the chain is the single most recognizable artifact of
  options trading.
- **Structural device** — every data panel shares the same hairline-border + corner-tick
  "instrument" chrome, so the whole app reads as one terminal rather than a stack of cards.

## Scope of this first prototype

Built: Vite + React + TypeScript + Tailwind v4, client-only, no backend.

- **Landing page** (`/`) — pitch, live chain preview, disclaimer footer.
- **App shell** (`/app`) — top bar (virtual equity, open P&L, reset account), live ticker
  ribbon, left nav (desktop) / bottom nav (mobile).
- **Dashboard** — equity curve, watchlist snippet, open positions snippet.
- **Watchlist** — NSE/BSE cash-market quotes with a starred subset.
- **Option chain** — NIFTY / BANKNIFTY / SENSEX, 3 upcoming expiries, calls-strike-puts
  grid with OI/IV/volume, ATM highlight, click a price to open the order ticket.
- **Order ticket** — buy/sell, market/limit, lot-based quantity, simulated fill.
- **Portfolio** — fund summary, open positions with one-click close.
- **Orders** — full fill history.

State (positions, orders, cash balance, watchlist) lives in a Zustand store persisted to
`localStorage`, so a session survives a reload. Market data is a seeded pseudo-random
generator — no real NSE/BSE feed is fetched (see `src/lib/marketData.ts`).

## What's intentionally not built yet

- **Auth / multi-user accounts** — right now there's one local account per browser.
- **Real market data** — would require a licensed data vendor; out of scope for a paper
  trading toy, and NSE/BSE data redistribution has real licensing restrictions.
- **Margin/risk engine** — margin shown in the order ticket is a rough estimate, not a
  real SPAN/exposure calculation.
- **Options Greeks, payoff charts, strategy builder** — natural next features once the
  core loop (chain → order → position → P&L) is validated.
- **Persistence beyond localStorage** — no server, so state doesn't sync across devices.

## Suggested next steps

1. Validate the core loop in the browser (this session did — see screenshots).
2. Decide if multi-leg strategies (spreads, straddles) matter for v1 or if single-leg is
   enough to start.
3. If this becomes a real product, plan a lightweight backend (auth + shared leaderboard
   or classroom mode) before investing further in client-only state.
