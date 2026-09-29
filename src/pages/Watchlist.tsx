import { useState } from "react"
import { Star } from "lucide-react"
import clsx from "clsx"
import { WATCHLIST } from "../lib/marketData"
import { useLiveTicks } from "../lib/useLiveTicks"
import { formatNumber } from "../lib/format"
import { usePortfolioStore } from "../lib/store"
import { Panel } from "../components/Panel"
import { PnlPercent, PnlText } from "../components/PnlText"

export default function Watchlist() {
  const quotes = useLiveTicks(WATCHLIST)
  const watchlistSymbols = usePortfolioStore((s) => s.watchlistSymbols)
  const toggleWatchlist = usePortfolioStore((s) => s.toggleWatchlist)
  const [starredOnly, setStarredOnly] = useState(false)

  const rows = starredOnly ? quotes.filter((q) => watchlistSymbols.includes(q.symbol)) : quotes

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-faint)]">
            NSE &amp; BSE cash market
          </p>
          <h1 className="text-xl font-semibold">Watchlist</h1>
        </div>
        <label className="flex min-h-9 items-center gap-2 text-sm text-[var(--color-text-dim)]">
          <input
            type="checkbox"
            checked={starredOnly}
            onChange={(e) => setStarredOnly(e.target.checked)}
            className="h-4 w-4 accent-[var(--color-amber)]"
          />
          Starred only
        </label>
      </div>

      <Panel padded={false}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-[11px] uppercase tracking-wide text-[var(--color-text-faint)]">
                <th className="px-4 py-2"></th>
                <th className="px-4 py-2">Symbol</th>
                <th className="px-4 py-2">Exchange</th>
                <th className="px-4 py-2 text-right">LTP</th>
                <th className="px-4 py-2 text-right">Change</th>
                <th className="px-4 py-2 text-right">Change %</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((q) => {
                const change = q.ltp - q.prevClose
                const pct = (change / q.prevClose) * 100
                const starred = watchlistSymbols.includes(q.symbol)
                return (
                  <tr key={q.symbol} className="border-b border-[var(--color-border)]/60 text-[13px]">
                    <td className="px-4 py-2">
                      <button
                        onClick={() => toggleWatchlist(q.symbol)}
                        aria-label={starred ? `Remove ${q.symbol} from watchlist` : `Add ${q.symbol} to watchlist`}
                        aria-pressed={starred}
                        className="flex h-8 w-8 items-center justify-center text-[var(--color-text-faint)] hover:text-[var(--color-amber)]"
                      >
                        <Star
                          size={16}
                          strokeWidth={1.75}
                          className={clsx(starred && "fill-[var(--color-amber)] text-[var(--color-amber)]")}
                        />
                      </button>
                    </td>
                    <td className="px-4 py-2">
                      <p className="font-medium text-[var(--color-text)]">{q.symbol}</p>
                      <p className="text-xs text-[var(--color-text-faint)]">{q.name}</p>
                    </td>
                    <td className="px-4 py-2 text-[var(--color-text-dim)]">{q.exchange}</td>
                    <td className="px-4 py-2 text-right font-mono font-tabular">{formatNumber(q.ltp, 2)}</td>
                    <td className="px-4 py-2 text-right">
                      <PnlText value={change} />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <PnlPercent value={pct} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  )
}
