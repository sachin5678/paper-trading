import { INDICES } from "../lib/marketData"
import { useLiveTicks } from "../lib/useLiveTicks"
import { formatNumber } from "../lib/format"
import { SimBadge } from "./SimBadge"

export function TickerRibbon() {
  const indices = useLiveTicks(INDICES)

  return (
    <div className="flex items-center gap-6 overflow-x-auto border-b border-[var(--color-border)] bg-[#03040a] px-4 py-2 text-sm">
      <div className="flex shrink-0 items-center gap-6">
        {indices.map((idx) => {
          const change = idx.ltp - idx.prevClose
          const pct = (change / idx.prevClose) * 100
          const up = change >= 0
          return (
            <div key={idx.symbol} className="flex shrink-0 items-baseline gap-2">
              <span className="font-mono text-[11px] tracking-wide text-[var(--color-text-faint)]">
                {idx.symbol}
              </span>
              <span
                className="ticker-glow font-mono font-tabular text-[13px] font-medium"
                style={{ color: up ? "var(--color-up)" : "var(--color-down)" }}
              >
                {formatNumber(idx.ltp, 2)}
              </span>
              <span
                className="font-mono font-tabular text-[11px]"
                style={{ color: up ? "var(--color-up)" : "var(--color-down)" }}
              >
                {up ? "▲" : "▼"} {Math.abs(pct).toFixed(2)}%
              </span>
            </div>
          )
        })}
      </div>
      <div className="ml-auto shrink-0">
        <SimBadge />
      </div>
    </div>
  )
}
