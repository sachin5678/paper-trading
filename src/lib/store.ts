import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { DailyPnlRecord, IntradayPoint, OrderDraft, OrderRecord, Position } from "./types"

export const STARTING_CAPITAL = 1_000_000

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
  placeOrder: (draft: OrderDraft) => void
  markToMarket: (ltpBySymbolKey: Record<string, number>) => void
  recordEquitySample: (equity: number) => void
  resetAccount: () => void
  toggleWatchlist: (symbol: string) => void
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
        const fillPrice = draft.orderType === "LIMIT" && draft.limitPrice ? draft.limitPrice : draft.marketPrice
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

        set((state) => {
          const key = positionKey(draft)
          const existing = state.positions.find(
            (p) => positionKey(p) === key && p.side === draft.side,
          )
          const opposite = state.positions.find(
            (p) => positionKey(p) === key && p.side !== draft.side,
          )

          let positions = state.positions

          if (opposite) {
            const closingLots = Math.min(opposite.lots, draft.lots)
            const remainingLots = opposite.lots - closingLots
            positions = state.positions
              .map((p) =>
                p === opposite
                  ? remainingLots > 0
                    ? { ...p, lots: remainingLots }
                    : null
                  : p,
              )
              .filter((p): p is Position => p !== null)

            const leftoverNewLots = draft.lots - closingLots
            if (leftoverNewLots > 0) {
              positions = [
                ...positions,
                {
                  id: crypto.randomUUID(),
                  underlying: draft.underlying,
                  kind: draft.kind,
                  strike: draft.strike,
                  expiry: draft.expiry,
                  side: draft.side,
                  lots: leftoverNewLots,
                  lotSize: draft.lotSize,
                  avgPrice: fillPrice,
                  ltp: draft.marketPrice,
                  openedAt: Date.now(),
                },
              ]
            }
          } else if (existing) {
            const totalLots = existing.lots + draft.lots
            const avgPrice = (existing.avgPrice * existing.lots + fillPrice * draft.lots) / totalLots
            positions = state.positions.map((p) =>
              p === existing ? { ...p, lots: totalLots, avgPrice, ltp: draft.marketPrice } : p,
            )
          } else {
            positions = [
              ...state.positions,
              {
                id: crypto.randomUUID(),
                underlying: draft.underlying,
                kind: draft.kind,
                strike: draft.strike,
                expiry: draft.expiry,
                side: draft.side,
                lots: draft.lots,
                lotSize: draft.lotSize,
                avgPrice: fillPrice,
                ltp: draft.marketPrice,
                openedAt: Date.now(),
              },
            ]
          }

          return {
            cashBalance: state.cashBalance + cashDelta,
            positions,
            orders: [order, ...state.orders],
          }
        })
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
