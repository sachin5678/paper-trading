import type { IndexQuote, OptionRow, Underlying, WatchlistQuote } from "./types"

// All prices/quotes below are synthetically generated for practice purposes.
// Nothing here is fetched from or represents real NSE/BSE market data.

export const INDICES: IndexQuote[] = [
  { symbol: "NIFTY 50", name: "Nifty 50", exchange: "NSE", ltp: 24812.35, prevClose: 24730.1 },
  { symbol: "SENSEX", name: "S&P BSE Sensex", exchange: "BSE", ltp: 81423.6, prevClose: 81190.25 },
  { symbol: "BANKNIFTY", name: "Nifty Bank", exchange: "NSE", ltp: 51894.2, prevClose: 51602.75 },
  { symbol: "FINNIFTY", name: "Nifty Financial Services", exchange: "NSE", ltp: 23410.85, prevClose: 23355.4 },
]

export const UNDERLYINGS: Underlying[] = [
  { symbol: "NIFTY", name: "Nifty 50", exchange: "NSE", lotSize: 25, strikeStep: 50, ltp: 24812.35, prevClose: 24730.1 },
  { symbol: "BANKNIFTY", name: "Nifty Bank", exchange: "NSE", lotSize: 15, strikeStep: 100, ltp: 51894.2, prevClose: 51602.75 },
  { symbol: "SENSEX", name: "S&P BSE Sensex", exchange: "BSE", lotSize: 10, strikeStep: 100, ltp: 81423.6, prevClose: 81190.25 },
]

export const WATCHLIST: WatchlistQuote[] = [
  { symbol: "RELIANCE", name: "Reliance Industries", exchange: "NSE", ltp: 2945.4, prevClose: 2921.8 },
  { symbol: "TCS", name: "Tata Consultancy Services", exchange: "NSE", ltp: 4102.15, prevClose: 4128.3 },
  { symbol: "HDFCBANK", name: "HDFC Bank", exchange: "NSE", ltp: 1712.6, prevClose: 1698.25 },
  { symbol: "INFY", name: "Infosys", exchange: "NSE", ltp: 1889.9, prevClose: 1875.5 },
  { symbol: "TATASTEEL", name: "Tata Steel", exchange: "BSE", ltp: 168.35, prevClose: 165.9 },
]

let seed = 42
function rand(): number {
  seed = (seed * 1664525 + 1013904223) % 4294967296
  return seed / 4294967296
}

export function randomWalk(price: number, volatility = 0.0006): number {
  const drift = (rand() - 0.5) * 2 * volatility
  return Math.max(1, price * (1 + drift))
}

// Weekly expiry weekday per underlying (Date#getDay() values), confirmed
// against each one's real Upstox contract calendar while building the live
// feed: NIFTY and BANKNIFTY both landed on Tuesday, SENSEX on Thursday.
// NSE/BSE have changed these before, so treat this as a snapshot, not a
// permanent fact — the same reason the simulated tabs shouldn't be trusted
// as a source of truth once live data is available.
const EXPIRY_WEEKDAY: Record<string, number> = {
  NIFTY: 2,
  BANKNIFTY: 2,
  SENSEX: 4,
}

export function upcomingExpiries(underlyingSymbol: string, count = 3): string[] {
  const weekday = EXPIRY_WEEKDAY[underlyingSymbol] ?? 2
  const out: string[] = []
  const now = new Date()
  const d = new Date(now)
  // Nearest matching weekday, including today if today is one. Deliberately
  // no `|| 7` fallback: if today is the expiry day, that's still the
  // nearest expiry, not next week's.
  d.setDate(d.getDate() + ((weekday - d.getDay() + 7) % 7))
  for (let i = 0; i < count; i++) {
    const expiry = new Date(d)
    expiry.setDate(d.getDate() + i * 7)
    out.push(
      expiry.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase(),
    )
  }
  return out
}

function normalCdf(x: number): number {
  return 1 / (1 + Math.exp(-1.702 * x))
}

// Simplified premium approximation (not real Black-Scholes) — good enough
// to render plausible, internally-consistent practice quotes.
function estimatePremium(spot: number, strike: number, kind: "CE" | "PE", iv: number, daysToExpiry: number): number {
  const t = Math.max(daysToExpiry, 1) / 365
  const distance = (spot - strike) / spot
  const z = kind === "CE" ? distance / (iv * Math.sqrt(t)) : -distance / (iv * Math.sqrt(t))
  const intrinsic = kind === "CE" ? Math.max(spot - strike, 0) : Math.max(strike - spot, 0)
  const timeValue = spot * iv * Math.sqrt(t) * normalCdf(z) * 0.4
  return Math.max(intrinsic + timeValue, 0.5)
}

export function buildOptionChain(underlying: Underlying, expiry: string, rows = 12): OptionRow[] {
  const { ltp, strikeStep } = underlying
  const atmStrike = Math.round(ltp / strikeStep) * strikeStep
  const half = Math.floor(rows / 2)
  const daysToExpiry = Math.max(1, Math.round((rows / 2) * 1.4))

  const chain: OptionRow[] = []
  for (let i = -half; i <= half; i++) {
    const strike = atmStrike + i * strikeStep
    const iv = 0.12 + rand() * 0.18
    const callLtp = estimatePremium(ltp, strike, "CE", iv, daysToExpiry)
    const putLtp = estimatePremium(ltp, strike, "PE", iv, daysToExpiry)
    chain.push({
      strike,
      expiry,
      call: {
        kind: "CE",
        ltp: round2(callLtp),
        prevClose: round2(callLtp * (1 - (rand() - 0.5) * 0.1)),
        oi: Math.round(50000 + rand() * 400000),
        oiChangePct: round2((rand() - 0.5) * 20),
        iv: round2(iv * 100),
        volume: Math.round(rand() * 90000),
        inTheMoney: strike < ltp,
      },
      put: {
        kind: "PE",
        ltp: round2(putLtp),
        prevClose: round2(putLtp * (1 - (rand() - 0.5) * 0.1)),
        oi: Math.round(50000 + rand() * 400000),
        oiChangePct: round2((rand() - 0.5) * 20),
        iv: round2(iv * 100),
        volume: Math.round(rand() * 90000),
        inTheMoney: strike > ltp,
      },
    })
  }
  return chain
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
