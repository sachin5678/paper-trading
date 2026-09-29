// Upstox instrument_key per underlying, needed for the option-chain query
// param. All three confirmed directly against the live API with a real
// token (not just pattern-matched from docs) while building the feed.
export const UPSTOX_INSTRUMENT_KEYS: Record<string, string> = {
  NIFTY: "NSE_INDEX|Nifty 50",
  BANKNIFTY: "NSE_INDEX|Nifty Bank",
  SENSEX: "BSE_INDEX|SENSEX",
}

export const SUPPORTED_UNDERLYINGS = Object.keys(UPSTOX_INSTRUMENT_KEYS)

// Keyed by the display symbol used in the ticker ribbon (marketData.ts's
// INDICES array), not the tradable-underlying symbol above — FINNIFTY has
// no option chain in this app, but still appears in the ribbon. Also
// confirmed directly against the live API.
export const INDEX_TICKER_INSTRUMENT_KEYS: Record<string, string> = {
  "NIFTY 50": "NSE_INDEX|Nifty 50",
  BANKNIFTY: "NSE_INDEX|Nifty Bank",
  SENSEX: "BSE_INDEX|SENSEX",
  FINNIFTY: "NSE_INDEX|Nifty Fin Service",
}
