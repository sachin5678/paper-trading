import type { VercelRequest, VercelResponse } from "@vercel/node"
import { INDEX_TICKER_INSTRUMENT_KEYS } from "../_lib/instruments.js"
import { getUpstoxToken } from "../_lib/store.js"
import { fetchLtpQuotes } from "../_lib/upstox.js"

export interface IndexQuoteData {
  symbol: string
  ltp: number
  prevClose: number
}

export type IndicesResponse =
  | { source: "live"; quotes: IndexQuoteData[] }
  | { source: "unavailable"; reason: string }

// Same "one shared feed for every visitor" reasoning as the option chain
// endpoint: index quotes are identical for everyone at a given moment.
const CACHE_TTL_MS = 4000
let cache: { at: number; payload: IndicesResponse } | null = null

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
    res.status(200).json(cache.payload)
    return
  }

  const payload = await buildResponse()
  cache = { at: Date.now(), payload }
  res.status(200).json(payload)
}

async function buildResponse(): Promise<IndicesResponse> {
  try {
    const token = await getUpstoxToken()
    if (!token) return { source: "unavailable", reason: "No broker connected yet" }
    if (token.expiresAt <= Date.now()) return { source: "unavailable", reason: "Broker token expired, needs reconnect" }

    const entries = Object.entries(INDEX_TICKER_INSTRUMENT_KEYS)
    const quotesByToken = await fetchLtpQuotes(
      token.accessToken,
      entries.map(([, key]) => key),
    )

    const quotes: IndexQuoteData[] = entries.map(([symbol, instrumentKey]) => {
      const quote = quotesByToken.get(instrumentKey)
      if (!quote) throw new Error(`Upstox did not return a quote for ${symbol}`)
      return { symbol, ltp: quote.ltp, prevClose: quote.prevClose }
    })

    return { source: "live", quotes }
  } catch (err) {
    return { source: "unavailable", reason: (err as Error).message }
  }
}
