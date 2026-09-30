import { useEffect } from "react"
import { usePortfolioStore } from "../lib/store"

const SAMPLE_INTERVAL_MS = 15_000

// Renders nothing — mounted once in AppShell so today's equity curve and the
// daily/monthly/yearly P&L history keep building regardless of which page is
// open. The store throttles how often a point is actually kept (see
// recordEquitySample in store.ts), so this interval just needs to be
// frequent enough that a point lands roughly on schedule, not exactly.
//
// This is client-only and reactive to whenever the app happens to be open —
// there's no server-side end-of-day job, so a day with the app never opened
// leaves no record, and "start of day" really means "equity when this was
// first sampled today," not a true market-open snapshot. Good enough for a
// practice tool; a real daily P&L ledger would need the server-persisted
// accounts this project has deliberately deferred (see PLAN.md Phase B).
export function DailyPnlEngine() {
  const recordEquitySample = usePortfolioStore((s) => s.recordEquitySample)

  useEffect(() => {
    function sample() {
      const { cashBalance, positions } = usePortfolioStore.getState()
      const equity = cashBalance + positions.reduce((sum, p) => sum + p.ltp * p.lots * p.lotSize, 0)
      recordEquitySample(equity)
    }

    sample()
    const id = window.setInterval(sample, SAMPLE_INTERVAL_MS)
    return () => window.clearInterval(id)
  }, [recordEquitySample])

  return null
}
