import { useEffect, useRef } from "react"
import { fetchLiveOptionChain } from "../lib/api"
import { UNDERLYINGS, buildOptionChain, randomWalk } from "../lib/marketData"
import { isMarketOpen } from "../lib/marketHours"
import type { OptionKind } from "../lib/types"
import { contractKey, isMarketable, usePortfolioStore } from "../lib/store"

const TICK_MS = 5000
// Wide enough that a held strike is very unlikely to fall outside the
// generated window even after the underlying has drifted for a while.
const CHAIN_WINDOW_ROWS = 40

interface PricingTarget {
  underlying: string
  kind: OptionKind
  strike: number
  expiry: string
}

// Renders nothing — mounted once in AppShell so open positions and pending
// limit orders keep ticking no matter which page is showing.
//
// Does two jobs against the same resolved prices each tick: marks open
// positions to market (P&L keeps moving — previously frozen forever, since
// nothing ever called markToMarket), and checks pending limit orders against
// the fresh price, filling one the moment the market actually reaches its
// limit (previously every limit order filled instantly at whatever price was
// typed, regardless of the real market).
//
// Prefers the real live feed per contract (matching both strike AND expiry,
// so a later-dated position never gets priced off the wrong contract) and
// falls back to the simulated model only for what live doesn't cover. The
// simulated fallback is anchored to the real live spot whenever one is
// available, even for an expiry live doesn't support — an earlier version
// let the simulated price free-walk from wherever it started, so a position
// opened during a live session could drift arbitrarily far from the real
// price still shown elsewhere on the same page. Only when no live spot is
// reachable at all does it fall back to a self-contained random walk.
export function MarkToMarketEngine() {
  const markToMarket = usePortfolioStore((s) => s.markToMarket)
  const fillPendingOrder = usePortfolioStore((s) => s.fillPendingOrder)
  const simulatedPrices = useRef<Record<string, number>>({})

  useEffect(() => {
    let cancelled = false

    async function tick() {
      const { positions, orders } = usePortfolioStore.getState()
      const pendingOrders = orders.filter((o) => o.status === "PENDING")
      if (positions.length === 0 && pendingOrders.length === 0) return

      const allTargets: PricingTarget[] = [...positions, ...pendingOrders]
      const byUnderlying = new Map<string, PricingTarget[]>()
      for (const target of allTargets) {
        const group = byUnderlying.get(target.underlying) ?? []
        group.push(target)
        byUnderlying.set(target.underlying, group)
      }

      const freshPrices: Record<string, number> = {}

      for (const [symbol, group] of byUnderlying) {
        const base = UNDERLYINGS.find((u) => u.symbol === symbol)
        if (!base) continue

        const liveChain = await fetchLiveOptionChain(symbol)
        const remaining: PricingTarget[] = []

        if (liveChain.source === "live") {
          for (const target of group) {
            const row = liveChain.rows.find((r) => r.strike === target.strike && r.expiry === target.expiry)
            if (row) {
              const leg = target.kind === "CE" ? row.call : row.put
              freshPrices[contractKey(target)] = leg.ltp
            } else {
              remaining.push(target)
            }
          }
        } else {
          remaining.push(...group)
        }

        if (remaining.length === 0) continue

        const realSpot = liveChain.source === "live" ? liveChain.underlyingLtp : undefined
        const averageHeldStrike = remaining.reduce((sum, t) => sum + t.strike, 0) / remaining.length
        const spotSeed = realSpot ?? simulatedPrices.current[symbol] ?? averageHeldStrike
        const nextPrice = realSpot !== undefined || !isMarketOpen() ? spotSeed : randomWalk(spotSeed)
        simulatedPrices.current[symbol] = nextPrice

        const byExpiry = new Map<string, PricingTarget[]>()
        for (const target of remaining) {
          const expiryGroup = byExpiry.get(target.expiry) ?? []
          expiryGroup.push(target)
          byExpiry.set(target.expiry, expiryGroup)
        }

        for (const [expiry, targetsInExpiry] of byExpiry) {
          const chain = buildOptionChain({ ...base, ltp: nextPrice }, expiry, CHAIN_WINDOW_ROWS)
          for (const target of targetsInExpiry) {
            const row = chain.find((r) => r.strike === target.strike)
            if (!row) continue
            const leg = target.kind === "CE" ? row.call : row.put
            freshPrices[contractKey(target)] = leg.ltp
          }
        }
      }

      if (cancelled) return

      if (positions.length > 0 && Object.keys(freshPrices).length > 0) markToMarket(freshPrices)

      for (const order of pendingOrders) {
        const freshPrice = freshPrices[contractKey(order)]
        if (freshPrice !== undefined && isMarketable(order.side, order.price, freshPrice)) {
          fillPendingOrder(order.id, order.price)
        }
      }
    }

    tick()
    const id = window.setInterval(tick, TICK_MS)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [markToMarket, fillPendingOrder])

  return null
}
