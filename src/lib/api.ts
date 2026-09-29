import type { OptionRow } from "./types"

export type OptionChainFeed =
  | { source: "live"; underlyingLtp: number; lotSize: number; rows: OptionRow[] }
  | { source: "unavailable"; reason: string }

// Always returns the nearest available expiry for the underlying — the
// backend resolves that against Upstox's real contract calendar rather than
// trusting a guessed keyword (see api/_lib/upstox.ts resolveNearestExpiry).
export async function fetchLiveOptionChain(underlying: string): Promise<OptionChainFeed> {
  try {
    const res = await fetch(`/api/market/option-chain?underlying=${underlying}`)
    const json = (await res.json()) as OptionChainFeed
    return json
  } catch {
    return { source: "unavailable", reason: "Could not reach the live feed" }
  }
}

export interface IndexQuoteData {
  symbol: string
  ltp: number
  prevClose: number
}

export type IndicesFeed =
  | { source: "live"; quotes: IndexQuoteData[] }
  | { source: "unavailable"; reason: string }

export async function fetchLiveIndices(): Promise<IndicesFeed> {
  try {
    const res = await fetch("/api/market/indices")
    const json = (await res.json()) as IndicesFeed
    return json
  } catch {
    return { source: "unavailable", reason: "Could not reach the live feed" }
  }
}
