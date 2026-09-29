import { useMemo, type ReactNode } from "react"
import { Link } from "react-router-dom"
import { WATCHLIST } from "../lib/marketData"
import { useLiveTicks } from "../lib/useLiveTicks"
import { formatCompactInr, formatNumber } from "../lib/format"
import { positionPnl, STARTING_CAPITAL, usePortfolioStore } from "../lib/store"
import { Panel } from "../components/Panel"
import { PnlPercent, PnlText } from "../components/PnlText"
import { Sparkline } from "../components/Sparkline"

export default function Dashboard() {
  const cashBalance = usePortfolioStore((s) => s.cashBalance)
  const positions = usePortfolioStore((s) => s.positions)
  const orders = usePortfolioStore((s) => s.orders)

  const openPnl = positions.reduce((sum, p) => sum + positionPnl(p), 0)
  const equity = cashBalance + positions.reduce((sum, p) => sum + p.ltp * p.lots * p.lotSize, 0)

  const equityHistory = useMemo(() => buildEquityHistory(equity), [equity])
  const watchlist = useLiveTicks(WATCHLIST)

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel eyebrow="Since account start · simulated" title="Account" className="lg:col-span-2">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-faint)]">
                Virtual equity
              </p>
              <p className="mt-1 font-mono font-tabular text-3xl text-[var(--color-text)]">
                {formatCompactInr(equity)}
              </p>
              <PnlPercent
                value={((equity - STARTING_CAPITAL) / STARTING_CAPITAL) * 100}
                className="mt-1 text-xs"
              />
            </div>
            <Sparkline
              points={equityHistory}
              width={280}
              height={64}
              color={equity >= STARTING_CAPITAL ? "var(--color-up)" : "var(--color-down)"}
            />
          </div>

          <div className="mt-5 grid grid-cols-3 divide-x divide-[var(--color-border)] border-t border-[var(--color-border)] pt-4">
            <MiniStat label="Cash balance" value={formatCompactInr(cashBalance)} />
            <MiniStat label="Open P&L" value={<PnlText value={openPnl} decimals={0} className="text-base" />} />
            <MiniStat label="Open positions" value={String(positions.length)} />
          </div>
        </Panel>

        <Panel title="Watchlist" eyebrow="Cash market" action={
          <Link to="/app/watchlist" className="text-xs text-[var(--color-amber)] hover:underline">
            View all
          </Link>
        }>
          <ul className="space-y-2.5">
            {watchlist.slice(0, 4).map((q) => {
              const pct = ((q.ltp - q.prevClose) / q.prevClose) * 100
              return (
                <li key={q.symbol} className="flex items-center justify-between text-sm">
                  <span className="text-[var(--color-text)]">{q.symbol}</span>
                  <div className="text-right">
                    <p className="font-mono font-tabular">{formatNumber(q.ltp, 2)}</p>
                    <PnlPercent value={pct} className="text-[11px]" />
                  </div>
                </li>
              )
            })}
          </ul>
        </Panel>
      </div>

      <Panel
        title="Open positions"
        eyebrow="F&O"
        action={
          <Link to="/app/portfolio" className="text-xs text-[var(--color-amber)] hover:underline">
            View portfolio
          </Link>
        }
        padded={positions.length === 0}
      >
        {positions.length === 0 ? (
          <EmptyState
            title="No open positions yet"
            body="Head to the option chain and place a simulated trade to see it here."
            action={
              <Link
                to="/app/option-chain"
                className="inline-block border border-[var(--color-amber)]/50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-amber)] hover:bg-[var(--color-amber-soft)]"
              >
                Open the option chain
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-left text-[11px] uppercase tracking-wide text-[var(--color-text-faint)]">
                  <th className="px-4 py-2">Instrument</th>
                  <th className="px-4 py-2 text-right">Side</th>
                  <th className="px-4 py-2 text-right">Qty</th>
                  <th className="px-4 py-2 text-right">Avg</th>
                  <th className="px-4 py-2 text-right">LTP</th>
                  <th className="px-4 py-2 text-right">P&amp;L</th>
                </tr>
              </thead>
              <tbody>
                {positions.slice(0, 5).map((p) => (
                  <tr key={p.id} className="border-b border-[var(--color-border)]/60 font-mono font-tabular text-[13px]">
                    <td className="px-4 py-2 font-sans text-[var(--color-text)]">
                      {p.underlying} {p.strike} {p.kind}
                    </td>
                    <td className={`px-4 py-2 text-right ${p.side === "BUY" ? "text-[var(--color-up)]" : "text-[var(--color-down)]"}`}>
                      {p.side}
                    </td>
                    <td className="px-4 py-2 text-right">{formatNumber(p.lots * p.lotSize)}</td>
                    <td className="px-4 py-2 text-right">{formatNumber(p.avgPrice, 2)}</td>
                    <td className="px-4 py-2 text-right">{formatNumber(p.ltp, 2)}</td>
                    <td className="px-4 py-2 text-right">
                      <PnlText value={positionPnl(p)} decimals={0} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {orders.length === 0 && positions.length === 0 && (
        <p className="text-center text-xs text-[var(--color-text-faint)]">
          Starting capital: {formatCompactInr(STARTING_CAPITAL)} · fully virtual, resettable anytime.
        </p>
      )}
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="px-4 first:pl-0 last:pr-0">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-faint)]">{label}</p>
      <p className="mt-1 font-mono font-tabular text-base text-[var(--color-text)]">{value}</p>
    </div>
  )
}

function EmptyState({ title, body, action }: { title: string; body: string; action: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2.5 px-4 py-8 text-center">
      <p className="text-sm font-medium text-[var(--color-text)]">{title}</p>
      <p className="max-w-xs text-xs text-[var(--color-text-dim)]">{body}</p>
      {action}
    </div>
  )
}

function buildEquityHistory(currentEquity: number, points = 24): number[] {
  let seed = Math.round(currentEquity) % 97
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280
    return seed / 233280
  }
  const series: number[] = []
  for (let i = 0; i < points - 1; i++) {
    const t = i / (points - 1)
    const base = STARTING_CAPITAL + (currentEquity - STARTING_CAPITAL) * t
    const noise = (rand() - 0.5) * STARTING_CAPITAL * 0.01
    series.push(base + noise)
  }
  series.push(currentEquity)
  return series
}
