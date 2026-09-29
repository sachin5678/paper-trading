import type { VercelRequest, VercelResponse } from "@vercel/node"
import type { OptionRow } from "../../src/lib/types.js"
import { SUPPORTED_UNDERLYINGS, UPSTOX_INSTRUMENT_KEYS } from "../_lib/instruments.js"
import { getUpstoxToken } from "../_lib/store.js"
import { fetchLiveOptionChain, resolveContractInfo } from "../_lib/upstox.js"

export type OptionChainResponse =
  | { source: "live"; underlyingLtp: number; lotSize: number; rows: OptionRow[] }
  | { source: "unavailable"; reason: string }

// Option-chain data is identical for every visitor at a given moment, so one
// short-lived in-memory cache (per warm serverless instance) is enough to
// keep concurrent traffic well under Upstox's rate limits. A cold instance
// just costs one extra upstream call, not a correctness issue.
const CACHE_TTL_MS = 4000
const cache = new Map<string, { at: number; payload: OptionChainResponse }>()

// Expiry and lot size don't change intraday, so this is cached far longer
// than the chain itself — one extra contracts-list call per underlying every
// 5 minutes, not one per poll.
const EXPIRY_CACHE_TTL_MS = 5 * 60 * 1000
const contractInfoCache = new Map<string, { at: number; expiry: string; lotSize: number }>()

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const underlying = typeof req.query.underlying === "string" ? req.query.underlying.toUpperCase() : ""

  if (!SUPPORTED_UNDERLYINGS.includes(underlying)) {
    res.status(400).json({ source: "unavailable", reason: `Unsupported underlying "${underlying}"` } satisfies OptionChainResponse)
    return
  }

  const cached = cache.get(underlying)
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    res.status(200).json(cached.payload)
    return
  }

  const payload = await buildResponse(underlying)
  cache.set(underlying, { at: Date.now(), payload })
  // "unavailable" is a well-defined, expected fallback state (no token yet,
  // token expired, upstream hiccup) — not a server error, so it still gets a
  // 200 with a discriminated body rather than a 5xx a client has to unwrap.
  res.status(200).json(payload)
}

async function buildResponse(underlying: string): Promise<OptionChainResponse> {
  try {
    const token = await getUpstoxToken()
    if (!token) return { source: "unavailable", reason: "No broker connected yet" }
    if (token.expiresAt <= Date.now()) return { source: "unavailable", reason: "Broker token expired, needs reconnect" }

    const instrumentKey = UPSTOX_INSTRUMENT_KEYS[underlying]
    const { expiry, lotSize } = await getContractInfo(token.accessToken, underlying, instrumentKey)
    const { rows, underlyingLtp } = await fetchLiveOptionChain(token.accessToken, instrumentKey, expiry)
    return { source: "live", underlyingLtp, lotSize, rows }
  } catch (err) {
    return { source: "unavailable", reason: (err as Error).message }
  }
}

async function getContractInfo(
  accessToken: string,
  underlying: string,
  instrumentKey: string,
): Promise<{ expiry: string; lotSize: number }> {
  const cached = contractInfoCache.get(underlying)
  if (cached && Date.now() - cached.at < EXPIRY_CACHE_TTL_MS) return cached

  const info = await resolveContractInfo(accessToken, instrumentKey)
  contractInfoCache.set(underlying, { at: Date.now(), ...info })
  return info
}
