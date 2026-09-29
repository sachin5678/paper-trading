import { useEffect, useRef } from "react"
import { fetchLiveOptionChain } from "../lib/api"
import { UNDERLYINGS, buildOptionChain, randomWalk } from "../lib/marketData"
import type { Position } from "../lib/types"
import { contractKey, usePortfolioStore } from "../lib/store"

const TICK_MS = 5000
// Wide enough that a held strike is very unlikely to fall outside the
// generated window even after the underlying has drifted for a while.
const CHAIN_WINDOW_ROWS = 40

// Renders nothing — mounted once in AppShell so open positions keep ticking
// (and P&L keeps moving) no matter which page is showing. Positions were
// previously frozen at their fill price forever, since nothing ever called
// the store's markToMarket action.
//
// Prefers the real live feed per position (matching both strike AND expiry,
// so a later-dated position never gets priced off the wrong contract) and
// falls back to the simulated model only for what live doesn't cover. The
// simulated fallback is anchored to the real live spot whenever one is
// available, even for an expiry live doesn't support — an earlier version
// let the simulated price free-walk from wherever it started, so a position
// opened during a live session could drift arbitrarily far from the real
// price still shown elsewhere on the same page (e.g. a PE showing "profit"
// while its real premium had actually fallen). Only when no live spot is
// reachable at all does it fall back to a self-contained random walk.
export function MarkToMarketEngine() {
  const markToMarket = usePortfolioStore((s) => s.markToMarket)
  const simulatedPrices = useRef<Record<string, number>>({})

  useEffect(() => {
    let cancelled = false

    async function tick() {
      const { positions } = usePortfolioStore.getState()
      if (positions.length === 0) return

      const byUnderlying = new Map<string, Position[]>()
      for (const position of positions) {
        const group = byUnderlying.get(position.underlying) ?? []
        group.push(position)
        byUnderlying.set(position.underlying, group)
      }

      const updates: Record<string, number> = {}

      for (const [symbol, group] of byUnderlying) {
        const base = UNDERLYINGS.find((u) => u.symbol === symbol)
        if (!base) continue

        const liveChain = await fetchLiveOptionChain(symbol)
        const remaining: Position[] = []

        if (liveChain.source === "live") {
          for (const position of group) {
            const row = liveChain.rows.find(
              (r) => r.strike === position.strike && r.expiry === position.expiry,
            )
            if (row) {
              const leg = position.kind === "CE" ? row.call : row.put
              updates[contractKey(position)] = leg.ltp
            } else {
              remaining.push(position)
            }
          }
        } else {
          remaining.push(...group)
        }

        if (remaining.length === 0) continue

        const realSpot = liveChain.source === "live" ? liveChain.underlyingLtp : undefined
        const averageHeldStrike = remaining.reduce((sum, p) => sum + p.strike, 0) / remaining.length
        const spotSeed = realSpot ?? simulatedPrices.current[symbol] ?? averageHeldStrike
        const nextPrice = realSpot !== undefined ? spotSeed : randomWalk(spotSeed)
        simulatedPrices.current[symbol] = nextPrice

        const byExpiry = new Map<string, Position[]>()
        for (const position of remaining) {
          const expiryGroup = byExpiry.get(position.expiry) ?? []
          expiryGroup.push(position)
          byExpiry.set(position.expiry, expiryGroup)
        }

        for (const [expiry, positionsInExpiry] of byExpiry) {
          const chain = buildOptionChain({ ...base, ltp: nextPrice }, expiry, CHAIN_WINDOW_ROWS)
          for (const position of positionsInExpiry) {
            const row = chain.find((r) => r.strike === position.strike)
            if (!row) continue
            const leg = position.kind === "CE" ? row.call : row.put
            updates[contractKey(position)] = leg.ltp
          }
        }
      }

      if (!cancelled && Object.keys(updates).length > 0) markToMarket(updates)
    }

    tick()
    const id = window.setInterval(tick, TICK_MS)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [markToMarket])

  return null
}
