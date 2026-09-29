import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { OrderDraft, OrderRecord, Position } from "./types"

export const STARTING_CAPITAL = 1_000_000

interface PortfolioState {
  cashBalance: number
  positions: Position[]
  orders: OrderRecord[]
  watchlistSymbols: string[]
  placeOrder: (draft: OrderDraft) => void
  markToMarket: (ltpBySymbolKey: Record<string, number>) => void
  resetAccount: () => void
  toggleWatchlist: (symbol: string) => void
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

      resetAccount: () =>
        set({ cashBalance: STARTING_CAPITAL, positions: [], orders: [] }),

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
