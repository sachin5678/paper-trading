import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { DailyPnlRecord, IntradayPoint, OrderDraft, OrderRecord, Position } from "./types"

export const STARTING_CAPITAL = 2_000_000

// Only points from an in-progress trading session are kept, throttled to
// avoid ballooning the persisted store if a tab is left open for hours.
const INTRADAY_POINT_MIN_GAP_MS = 60_000
// ~13 months at one row/day — plenty for a "this year" rollup without the
// history growing unbounded forever.
const MAX_DAILY_HISTORY = 400

interface PortfolioState {
  cashBalance: number
  positions: Position[]
  orders: OrderRecord[]
  watchlistSymbols: string[]
  dailyPnlHistory: DailyPnlRecord[]
  todayIntradayPoints: IntradayPoint[]
  /** Returns whether it filled immediately or is now resting as PENDING. */
  placeOrder: (draft: OrderDraft) => { status: "FILLED" | "PENDING"; price: number }
  fillPendingOrder: (orderId: string, fillPrice: number) => void
  cancelOrder: (orderId: string) => void
  markToMarket: (ltpBySymbolKey: Record<string, number>) => void
  recordEquitySample: (equity: number) => void
  resetAccount: () => void
  toggleWatchlist: (symbol: string) => void
}

// A BUY limit only makes sense at or below the market (you're capping what
// you'll pay); a SELL limit only makes sense at or above it (you're setting
// a floor on what you'll accept). "Marketable" means the current price
// already satisfies that — i.e. it can fill right now instead of resting.
export function isMarketable(side: "BUY" | "SELL", limitPrice: number, marketPrice: number): boolean {
  return side === "BUY" ? marketPrice <= limitPrice : marketPrice >= limitPrice
}

function applyFillToPositions(
  positions: Position[],
  fill: { underlying: string; kind: Position["kind"]; strike: number; expiry: string; side: Position["side"]; lots: number; lotSize: number },
  fillPrice: number,
  markPrice: number,
): Position[] {
  const key = positionKey(fill)
  const existing = positions.find((p) => positionKey(p) === key && p.side === fill.side)
  const opposite = positions.find((p) => positionKey(p) === key && p.side !== fill.side)

  if (opposite) {
    const closingLots = Math.min(opposite.lots, fill.lots)
    const remainingLots = opposite.lots - closingLots
    let next = positions
      .map((p) => (p === opposite ? (remainingLots > 0 ? { ...p, lots: remainingLots } : null) : p))
      .filter((p): p is Position => p !== null)

    const leftoverNewLots = fill.lots - closingLots
    if (leftoverNewLots > 0) {
      next = [
        ...next,
        {
          id: crypto.randomUUID(),
          underlying: fill.underlying,
          kind: fill.kind,
          strike: fill.strike,
          expiry: fill.expiry,
          side: fill.side,
          lots: leftoverNewLots,
          lotSize: fill.lotSize,
          avgPrice: fillPrice,
          ltp: markPrice,
          openedAt: Date.now(),
        },
      ]
    }
    return next
  }

  if (existing) {
    const totalLots = existing.lots + fill.lots
    const avgPrice = (existing.avgPrice * existing.lots + fillPrice * fill.lots) / totalLots
    return positions.map((p) => (p === existing ? { ...p, lots: totalLots, avgPrice, ltp: markPrice } : p))
  }

  return [
    ...positions,
    {
      id: crypto.randomUUID(),
      underlying: fill.underlying,
      kind: fill.kind,
      strike: fill.strike,
      expiry: fill.expiry,
      side: fill.side,
      lots: fill.lots,
      lotSize: fill.lotSize,
      avgPrice: fillPrice,
      ltp: markPrice,
      openedAt: Date.now(),
    },
  ]
}

// Local calendar date, not UTC — IST is ahead of UTC, so toISOString() can
// silently land on the wrong day for early-morning samples.
export function localDateString(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function positionKey(p: Pick<Position, "underlying" | "kind" | "strike" | "expiry">): string {
  return `${p.underlying}-${p.kind}-${p.strike}-${p.expiry}`
}

export function contractKey(p: { underlying: string; kind: string; strike: number; expiry: string }): string {
  return `${p.underlying}-${p.kind}-${p.strike}-${p.expiry}`
}

export const usePortfolioStore = create<PortfolioState>()(
  persist(
    (set) => ({
      cashBalance: STARTING_CAPITAL,
      positions: [],
      orders: [],
      watchlistSymbols: ["RELIANCE", "TCS", "HDFCBANK", "INFY"],
      dailyPnlHistory: [],
      todayIntradayPoints: [],

      placeOrder: (draft) => {
        const wantsLimit = draft.orderType === "LIMIT" && draft.limitPrice !== undefined
        const marketable = !wantsLimit || isMarketable(draft.side, draft.limitPrice!, draft.marketPrice)

        if (!marketable) {
          // Resting order: a real exchange holds this in the book at your
          // limit price until the market comes to it (or it's cancelled) —
          // it does not fill immediately at an unreachable price, and it
          // does not create a position or move cash until it actually does.
          const order: OrderRecord = {
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            underlying: draft.underlying,
            kind: draft.kind,
            strike: draft.strike,
            expiry: draft.expiry,
            side: draft.side,
            orderType: draft.orderType,
            lots: draft.lots,
            lotSize: draft.lotSize,
            price: draft.limitPrice!,
            status: "PENDING",
          }
          set((state) => ({ orders: [order, ...state.orders] }))
          return { status: "PENDING", price: draft.limitPrice! }
        }

        // Marketable: fills at the current price, not the typed limit — a
        // marketable limit order gets whatever's actually achievable right
        // now (at least as good as the limit you set), same as a real
        // exchange would give you.
        const fillPrice = draft.marketPrice
        const contractSize = draft.lots * draft.lotSize
        const cashDelta = draft.side === "BUY" ? -fillPrice * contractSize : fillPrice * contractSize

        const order: OrderRecord = {
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          underlying: draft.underlying,
          kind: draft.kind,
          strike: draft.strike,
          expiry: draft.expiry,
          side: draft.side,
          orderType: draft.orderType,
          lots: draft.lots,
          lotSize: draft.lotSize,
          price: fillPrice,
          status: "FILLED",
        }

        set((state) => ({
          cashBalance: state.cashBalance + cashDelta,
          positions: applyFillToPositions(state.positions, draft, fillPrice, draft.marketPrice),
          orders: [order, ...state.orders],
        }))
        return { status: "FILLED", price: fillPrice }
      },

      fillPendingOrder: (orderId, fillPrice) => {
        set((state) => {
          const order = state.orders.find((o) => o.id === orderId && o.status === "PENDING")
          if (!order) return state

          const contractSize = order.lots * order.lotSize
          const cashDelta = order.side === "BUY" ? -fillPrice * contractSize : fillPrice * contractSize

          return {
            cashBalance: state.cashBalance + cashDelta,
            positions: applyFillToPositions(state.positions, order, fillPrice, fillPrice),
            orders: state.orders.map((o) =>
              o.id === orderId ? { ...o, status: "FILLED", price: fillPrice, filledAt: Date.now() } : o,
            ),
          }
        })
      },

      cancelOrder: (orderId) => {
        set((state) => ({
          orders: state.orders.map((o) => (o.id === orderId && o.status === "PENDING" ? { ...o, status: "CANCELLED" } : o)),
        }))
      },

      markToMarket: (ltpBySymbolKey) => {
        set((state) => ({
          positions: state.positions.map((p) => {
            const key = contractKey(p)
            const ltp = ltpBySymbolKey[key]
            return ltp !== undefined ? { ...p, ltp } : p
          }),
        }))
      },

      recordEquitySample: (equity) => {
        set((state) => {
          const today = localDateString(new Date())
          const history = [...state.dailyPnlHistory]
          const todayIndex = history.findIndex((r) => r.date === today)

          if (todayIndex === -1) {
            // First sample of a new calendar day — the previous session's
            // intraday points (if any) belong to a day that's already
            // finalized in history, so they're dropped rather than carried
            // over into today's chart.
            history.push({ date: today, startEquity: equity, endEquity: equity })
            return {
              dailyPnlHistory: history.slice(-MAX_DAILY_HISTORY),
              todayIntradayPoints: [{ t: Date.now(), equity }],
            }
          }

          history[todayIndex] = { ...history[todayIndex], endEquity: equity }
          const points = state.todayIntradayPoints
          const last = points[points.length - 1]
          const shouldAddPoint = !last || Date.now() - last.t >= INTRADAY_POINT_MIN_GAP_MS
          return {
            dailyPnlHistory: history,
            todayIntradayPoints: shouldAddPoint ? [...points, { t: Date.now(), equity }] : points,
          }
        })
      },

      resetAccount: () =>
        set({
          cashBalance: STARTING_CAPITAL,
          positions: [],
          orders: [],
          dailyPnlHistory: [],
          todayIntradayPoints: [],
        }),

      toggleWatchlist: (symbol) =>
        set((state) => ({
          watchlistSymbols: state.watchlistSymbols.includes(symbol)
            ? state.watchlistSymbols.filter((s) => s !== symbol)
            : [...state.watchlistSymbols, symbol],
        })),
    }),
    { name: "paisa-paper-portfolio" },
  ),
)

const STORAGE_KEY = "paisa-paper-portfolio"

// Without this, a second tab left open (e.g. Option Chain in one, Portfolio
// in another — an entirely normal way to use this app) keeps its own stale
// in-memory copy of the store. MarkToMarketEngine/DailyPnlEngine tick in
// every open tab independently, and each tick's set() call flushes that
// tab's *entire* current state back to localStorage — so a stale tab
// silently overwrites trades made in a fresher one the moment its own timer
// next fires. The native `storage` event only fires on tabs that didn't make
// the write, which is exactly what's needed here: catch it and rehydrate so
// every tab converges on whatever was written most recently.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) {
      usePortfolioStore.persist.rehydrate()
    }
  })
}

export function positionPnl(position: Position): number {
  const direction = position.side === "BUY" ? 1 : -1
  return direction * (position.ltp - position.avgPrice) * position.lots * position.lotSize
}

export function dailyRecordPnl(record: DailyPnlRecord): number {
  return record.endEquity - record.startEquity
}

export function sumPnlForPrefix(history: DailyPnlRecord[], datePrefix: string): number {
  return history
    .filter((r) => r.date.startsWith(datePrefix))
    .reduce((sum, r) => sum + dailyRecordPnl(r), 0)
}
