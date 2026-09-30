import { type ReactNode } from "react"
import { Link } from "react-router-dom"
import { WATCHLIST } from "../lib/marketData"
import { useLiveTicks } from "../lib/useLiveTicks"
import { formatCompactInr, formatNumber } from "../lib/format"
import { dailyRecordPnl, positionPnl, STARTING_CAPITAL, usePortfolioStore } from "../lib/store"
import { useTodayDateString } from "../lib/useToday"
import { Panel } from "../components/Panel"
import { PnlPercent, PnlText } from "../components/PnlText"
import { Sparkline } from "../components/Sparkline"

export default function Dashboard() {
  const cashBalance = usePortfolioStore((s) => s.cashBalance)
  const positions = usePortfolioStore((s) => s.positions)
  const orders = usePortfolioStore((s) => s.orders)
  const dailyPnlHistory = usePortfolioStore((s) => s.dailyPnlHistory)
  const todayIntradayPoints = usePortfolioStore((s) => s.todayIntradayPoints)
  const today = useTodayDateString()

  const openPnl = positions.reduce((sum, p) => sum + positionPnl(p), 0)
  const equity = cashBalance + positions.reduce((sum, p) => sum + p.ltp * p.lots * p.lotSize, 0)

  const todayRecord = dailyPnlHistory.find((r) => r.date === today)
  const todayStartEquity = todayRecord?.startEquity ?? equity
  const todayPnl = todayRecord ? dailyRecordPnl(todayRecord) : 0
  const todayPnlPct = todayStartEquity !== 0 ? (todayPnl / todayStartEquity) * 100 : 0
  const intradaySeries = todayIntradayPoints.map((p) => p.equity - todayStartEquity)

  const watchlist = useLiveTicks(WATCHLIST)

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel eyebrow="Real mark-to-market, not a simulated backfill" title="Today's P&L" className="lg:col-span-2">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-faint)]">
                Since you opened the app today
              </p>
              <PnlText value={todayPnl} decimals={0} className="mt-1 text-3xl" />
              <PnlPercent value={todayPnlPct} className="mt-1 text-xs" />
            </div>
            {intradaySeries.length >= 2 ? (
              <Sparkline
                points={intradaySeries}
                width={280}
                height={64}
                color={todayPnl >= 0 ? "var(--color-up)" : "var(--color-down)"}
              />
            ) : (
              <p className="text-xs text-[var(--color-text-faint)]">
                Check back in a bit — building today's chart as prices tick.
              </p>
            )}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-y-3 divide-[var(--color-border)] border-t border-[var(--color-border)] pt-4 sm:grid-cols-4 sm:divide-x">
            <MiniStat label="Virtual equity" value={formatCompactInr(equity)} />
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
