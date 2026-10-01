import { useEffect, useState } from "react"
import { INDICES } from "../lib/marketData"
import { useLiveTicks } from "../lib/useLiveTicks"
import { fetchLiveIndices, type IndicesFeed } from "../lib/api"
import { formatNumber } from "../lib/format"
import { isMarketOpen } from "../lib/marketHours"
import { FeedBadge } from "./FeedBadge"

const POLL_MS = 4000

export function TickerRibbon() {
  const simulated = useLiveTicks(INDICES)
  const [feed, setFeed] = useState<IndicesFeed | null>(null)
  const [marketOpen, setMarketOpen] = useState(isMarketOpen)

  useEffect(() => {
    const id = window.setInterval(() => setMarketOpen(isMarketOpen()), 30_000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    let cancelled = false
    async function poll() {
      const result = await fetchLiveIndices()
      if (!cancelled) setFeed(result)
    }
    poll()
    const id = window.setInterval(poll, POLL_MS)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [])

  const isLive = feed?.source === "live"
  const indices = isLive
    ? INDICES.map((fallback) => feed.quotes.find((q) => q.symbol === fallback.symbol) ?? fallback)
    : simulated

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
      <div className="ml-auto flex shrink-0 items-center gap-2">
        {!marketOpen && (
          <span className="inline-flex items-center gap-1.5 border border-[var(--color-border-strong)] px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--color-text-dim)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-text-faint)]" aria-hidden="true" />
            Market closed
          </span>
        )}
        <FeedBadge source={isLive ? "live" : "simulated"} />
      </div>
    </div>
  )
}
