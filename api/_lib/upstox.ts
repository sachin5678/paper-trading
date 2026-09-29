import type { OptionLeg, OptionRow } from "../../src/lib/types.js"

const TOKEN_URL = "https://api.upstox.com/v2/login/authorization/token"
const OPTION_CHAIN_URL = "https://api.upstox.com/v2/option/chain"
const OPTION_CONTRACTS_URL = "https://api.upstox.com/v2/option/contract"
const LTP_QUOTE_URL = "https://api.upstox.com/v3/market-quote/ltp"

export function buildAuthorizeUrl(state: string): string {
  const clientId = requireEnv("UPSTOX_CLIENT_ID")
  const redirectUri = requireEnv("UPSTOX_REDIRECT_URI")
  const url = new URL("https://api.upstox.com/v2/login/authorization/dialog")
  url.searchParams.set("client_id", clientId)
  url.searchParams.set("redirect_uri", redirectUri)
  url.searchParams.set("response_type", "code")
  url.searchParams.set("state", state)
  return url.toString()
}

export async function exchangeCodeForToken(code: string): Promise<{ accessToken: string; expiresAt: number }> {
  const body = new URLSearchParams({
    code,
    client_id: requireEnv("UPSTOX_CLIENT_ID"),
    client_secret: requireEnv("UPSTOX_CLIENT_SECRET"),
    redirect_uri: requireEnv("UPSTOX_REDIRECT_URI"),
    grant_type: "authorization_code",
  })

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body,
  })

  if (!res.ok) {
    throw new Error(`Upstox token exchange failed: ${res.status} ${await res.text()}`)
  }

  const json = (await res.json()) as { access_token: string }
  return { accessToken: json.access_token, expiresAt: nextUpstoxTokenExpiry() }
}

// Upstox access tokens are valid until 3:30 AM IST the day after issue,
// regardless of exactly when they were issued.
function nextUpstoxTokenExpiry(): number {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000
  const nowIst = new Date(Date.now() + IST_OFFSET_MS)
  const expiryIst = new Date(Date.UTC(nowIst.getUTCFullYear(), nowIst.getUTCMonth(), nowIst.getUTCDate(), 3, 30, 0))
  if (nowIst.getTime() >= expiryIst.getTime()) {
    expiryIst.setUTCDate(expiryIst.getUTCDate() + 1)
  }
  return expiryIst.getTime() - IST_OFFSET_MS
}

interface UpstoxOptionLeg {
  instrument_key: string
  market_data: {
    ltp: number
    volume: number
    oi: number
    close_price: number
    prev_oi?: number
  }
  option_greeks: {
    iv: number
  }
}

interface UpstoxChainEntry {
  expiry: string
  strike_price: number
  underlying_spot_price: number
  call_options: UpstoxOptionLeg
  put_options: UpstoxOptionLeg
}

interface UpstoxChainResponse {
  status: string
  data: UpstoxChainEntry[]
}

interface UpstoxContract {
  expiry: string
  lot_size: number
}

interface UpstoxContractsResponse {
  status: string
  data: UpstoxContract[]
}

// Upstox documents "current_week"/"current_month" keywords for expiry_date,
// but a live test against this account's NIFTY chain returned zero contracts
// for "current_week" even though NIFTY does still expire weekly (Tuesdays).
// Rather than chase why the keyword didn't resolve, ask Upstox's own
// contracts list for the actual nearest expiry — correct regardless of
// keyword behavior or future changes to the expiry calendar. Lot size comes
// from the same call: NSE revises these periodically (NIFTY was 25 lots
// not long ago, is 65 as of this account's live data), and our static
// UNDERLYINGS config in marketData.ts is a simulated-mode approximation,
// not something live trading math should ever use.
export async function resolveContractInfo(
  accessToken: string,
  instrumentKey: string,
): Promise<{ expiry: string; lotSize: number }> {
  const url = new URL(OPTION_CONTRACTS_URL)
  url.searchParams.set("instrument_key", instrumentKey)

  const res = await fetch(url, {
    headers: { Accept: "application/json", Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    throw new Error(`Upstox option contracts request failed: ${res.status} ${await res.text()}`)
  }

  const json = (await res.json()) as UpstoxContractsResponse
  if (!json.data?.length) throw new Error("Upstox returned no option contracts for this instrument")

  const nearestExpiry = Array.from(new Set(json.data.map((c) => c.expiry))).sort()[0]
  const lotSize = json.data.find((c) => c.expiry === nearestExpiry)?.lot_size ?? json.data[0].lot_size
  return { expiry: nearestExpiry, lotSize }
}

export async function fetchLiveOptionChain(
  accessToken: string,
  instrumentKey: string,
  expiryDate: string,
): Promise<{ rows: OptionRow[]; underlyingLtp: number }> {
  const url = new URL(OPTION_CHAIN_URL)
  url.searchParams.set("instrument_key", instrumentKey)
  url.searchParams.set("expiry_date", expiryDate)

  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!res.ok) {
    throw new Error(`Upstox option chain request failed: ${res.status} ${await res.text()}`)
  }

  const json = (await res.json()) as UpstoxChainResponse
  if (!json.data?.length) throw new Error("Upstox returned an empty option chain")

  const underlyingLtp = json.data[0].underlying_spot_price
  const rows = json.data
    .map((entry) => toOptionRow(entry, underlyingLtp))
    .sort((a, b) => a.strike - b.strike)

  return { rows: windowAroundAtm(rows, underlyingLtp), underlyingLtp }
}

// Upstox lists every strike ever listed for the expiry (138+ for NIFTY,
// spanning far out-of-the-money deep-discount strikes nobody trades) — a real
// terminal only shows a tight window around the money. Match the simulated
// table's scale instead of dumping the whole list on the page.
const ATM_WINDOW = 12

function windowAroundAtm(rows: OptionRow[], underlyingLtp: number): OptionRow[] {
  let atmIndex = 0
  let smallestDistance = Infinity
  rows.forEach((row, i) => {
    const distance = Math.abs(row.strike - underlyingLtp)
    if (distance < smallestDistance) {
      smallestDistance = distance
      atmIndex = i
    }
  })
  const start = Math.max(0, atmIndex - ATM_WINDOW)
  const end = Math.min(rows.length, atmIndex + ATM_WINDOW + 1)
  return rows.slice(start, end)
}

function toOptionRow(entry: UpstoxChainEntry, underlyingLtp: number): OptionRow {
  return {
    strike: entry.strike_price,
    expiry: entry.expiry,
    call: toOptionLeg(entry.call_options, "CE", entry.strike_price < underlyingLtp),
    put: toOptionLeg(entry.put_options, "PE", entry.strike_price > underlyingLtp),
  }
}

function toOptionLeg(leg: UpstoxOptionLeg, kind: "CE" | "PE", inTheMoney: boolean): OptionLeg {
  const oi = leg.market_data.oi
  const prevOi = leg.market_data.prev_oi
  return {
    kind,
    ltp: leg.market_data.ltp,
    prevClose: leg.market_data.close_price,
    oi,
    oiChangePct: prevOi ? ((oi - prevOi) / prevOi) * 100 : 0,
    iv: leg.option_greeks?.iv ?? 0,
    volume: leg.market_data.volume,
    inTheMoney,
  }
}

interface UpstoxLtpQuote {
  last_price: number
  instrument_token: string
  cp: number
}

interface UpstoxLtpResponse {
  status: string
  data: Record<string, UpstoxLtpQuote>
}

// Despite Upstox's own docs claiming the response's data keys match the
// requested instrument_key exactly, a live test showed otherwise — the
// response actually keys by a colon-separated trading-symbol form (e.g.
// "NSE_INDEX:Nifty 50") while the request uses a pipe ("NSE_INDEX|Nifty
// 50"). Matching by each entry's own instrument_token field instead sidesteps
// that entirely and doesn't depend on guessing the exact key transformation.
export async function fetchLtpQuotes(
  accessToken: string,
  instrumentKeys: string[],
): Promise<Map<string, { ltp: number; prevClose: number }>> {
  const url = new URL(LTP_QUOTE_URL)
  url.searchParams.set("instrument_key", instrumentKeys.join(","))

  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!res.ok) {
    throw new Error(`Upstox LTP quote request failed: ${res.status} ${await res.text()}`)
  }

  const json = (await res.json()) as UpstoxLtpResponse
  const byInstrumentToken = new Map<string, { ltp: number; prevClose: number }>()
  for (const quote of Object.values(json.data)) {
    byInstrumentToken.set(quote.instrument_token, { ltp: quote.last_price, prevClose: quote.cp })
  }
  return byInstrumentToken
}

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is not set`)
  return value
}
