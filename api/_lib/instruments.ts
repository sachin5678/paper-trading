// Upstox instrument_key per underlying, needed for the option-chain query param.
// NIFTY 50 confirmed against Upstox's own API docs example. BANKNIFTY and SENSEX
// are the documented naming pattern (NSE_INDEX| / BSE_INDEX|) but have not been
// cross-checked against Upstox's published instrument master file — verify
// before relying on them if the live call 404s for those two.
export const UPSTOX_INSTRUMENT_KEYS: Record<string, string> = {
  NIFTY: "NSE_INDEX|Nifty 50",
  BANKNIFTY: "NSE_INDEX|Nifty Bank",
  SENSEX: "BSE_INDEX|SENSEX",
}

export const SUPPORTED_UNDERLYINGS = Object.keys(UPSTOX_INSTRUMENT_KEYS)
