import { useEffect, useRef } from "react"
import { UNDERLYINGS, buildOptionChain, randomWalk } from "../lib/marketData"
import { contractKey, usePortfolioStore } from "../lib/store"

const TICK_MS = 3000
// Wide enough that a held strike is very unlikely to fall outside the
// generated window even after the underlying has drifted for a while.
const CHAIN_WINDOW_ROWS = 40

// Renders nothing — mounted once in AppShell so open positions keep ticking
// (and P&L keeps moving) no matter which page is showing. Positions were
// previously frozen at their fill price forever, since nothing ever called
// the store's markToMarket action.
//
// This always uses the simulated pricing model, even for a NIFTY position
// while the option chain page has a live Upstox feed connected — mixing
// live fetches into a background loop across arbitrary underlyings adds
// real complexity (rate limits, multiple concurrent underlyings) for a
// P&L number that only needs to feel alive, not be tick-accurate. Real
// live mark-to-market is a reasonable Phase B refinement.
export function MarkToMarketEngine() {
  const markToMarket = usePortfolioStore((s) => s.markToMarket)
  const simulatedPrices = useRef<Record<string, number>>({})

  useEffect(() => {
    const id = window.setInterval(() => {
      const { positions } = usePortfolioStore.getState()
      if (positions.length === 0) return

      const byUnderlying = new Map<string, typeof positions>()
      for (const position of positions) {
        const group = byUnderlying.get(position.underlying) ?? []
        group.push(position)
        byUnderlying.set(position.underlying, group)
      }

      const updates: Record<string, number> = {}
      for (const [symbol, group] of byUnderlying) {
        const base = UNDERLYINGS.find((u) => u.symbol === symbol)
        if (!base) continue

        const previousPrice = simulatedPrices.current[symbol] ?? base.ltp
        const nextPrice = randomWalk(previousPrice)
        simulatedPrices.current[symbol] = nextPrice

        const byExpiry = new Map<string, typeof positions>()
        for (const position of group) {
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

      if (Object.keys(updates).length > 0) markToMarket(updates)
    }, TICK_MS)

    return () => window.clearInterval(id)
  }, [markToMarket])

  return null
}
