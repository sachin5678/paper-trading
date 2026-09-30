export type OptionKind = "CE" | "PE"
export type OrderSide = "BUY" | "SELL"
export type OrderType = "MARKET" | "LIMIT"
export type OrderStatus = "FILLED" | "PENDING" | "CANCELLED"

export interface IndexQuote {
  symbol: string
  name: string
  exchange: "NSE" | "BSE"
  ltp: number
  prevClose: number
}

export interface Underlying {
  symbol: string
  name: string
  exchange: "NSE" | "BSE"
  lotSize: number
  strikeStep: number
  ltp: number
  prevClose: number
}

export interface WatchlistQuote {
  symbol: string
  name: string
  exchange: "NSE" | "BSE"
  ltp: number
  prevClose: number
}

export interface OptionRow {
  strike: number
  expiry: string
  call: OptionLeg
  put: OptionLeg
}

export interface OptionLeg {
  kind: OptionKind
  ltp: number
  prevClose: number
  oi: number
  oiChangePct: number
  iv: number
  volume: number
  inTheMoney: boolean
}

export interface Position {
  id: string
  underlying: string
  kind: OptionKind
  strike: number
  expiry: string
  side: OrderSide
  lots: number
  lotSize: number
  avgPrice: number
  ltp: number
  openedAt: number
}

export interface OrderRecord {
  id: string
  timestamp: number
  underlying: string
  kind: OptionKind
  strike: number
  expiry: string
  side: OrderSide
  orderType: OrderType
  lots: number
  lotSize: number
  /** Fill price once FILLED; the resting limit price while still PENDING. */
  price: number
  status: OrderStatus
  /** Set when a PENDING order later fills — distinct from `timestamp` (placed-at). */
  filledAt?: number
}

export interface OrderDraft {
  underlying: string
  kind: OptionKind
  strike: number
  expiry: string
  side: OrderSide
  orderType: OrderType
  lots: number
  lotSize: number
  limitPrice?: number
  marketPrice: number
}

export interface DailyPnlRecord {
  /** Local calendar date, YYYY-MM-DD — not UTC, see localDateString in store.ts. */
  date: string
  startEquity: number
  endEquity: number
}

export interface IntradayPoint {
  t: number
  equity: number
}
