import { useState } from "react"
import { Link } from "react-router-dom"
import { formatCompactInr, formatInr, formatNumber } from "../lib/format"
import { dailyRecordPnl, positionPnl, STARTING_CAPITAL, sumPnlForPrefix, usePortfolioStore } from "../lib/store"
import { useTodayDateString } from "../lib/useToday"
import { Panel } from "../components/Panel"
import { PnlText } from "../components/PnlText"
import { OrderTicket, type OrderTicketContext } from "../components/OrderTicket"
import { Toast } from "../components/Toast"

const RECENT_DAYS_SHOWN = 14

export default function Portfolio() {
  const cashBalance = usePortfolioStore((s) => s.cashBalance)
  const positions = usePortfolioStore((s) => s.positions)
  const dailyPnlHistory = usePortfolioStore((s) => s.dailyPnlHistory)
  const [ticket, setTicket] = useState<OrderTicketContext | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const openPnl = positions.reduce((sum, p) => sum + positionPnl(p), 0)
  const marketValue = positions.reduce((sum, p) => sum + p.ltp * p.lots * p.lotSize, 0)
  const equity = cashBalance + marketValue

  const today = useTodayDateString()
  const monthPnl = sumPnlForPrefix(dailyPnlHistory, today.slice(0, 7))
  const yearPnl = sumPnlForPrefix(dailyPnlHistory, today.slice(0, 4))
  const recentDays = [...dailyPnlHistory].reverse().slice(0, RECENT_DAYS_SHOWN)

  return (
    <div className="space-y-4">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-faint)]">
          Virtual demat &amp; F&amp;O book
        </p>
        <h1 className="font-display text-xl font-semibold">Portfolio</h1>
      </div>

      <Panel title="Fund summary" eyebrow="Virtual, resettable anytime">
        <div className="grid grid-cols-2 gap-y-4 sm:grid-cols-5 sm:divide-x sm:divide-[var(--color-border)]">
          <SummaryStat label="Starting capital" value={formatCompactInr(STARTING_CAPITAL)} />
          <SummaryStat label="Cash balance" value={formatCompactInr(cashBalance)} />
          <SummaryStat label="Positions value" value={formatCompactInr(marketValue)} />
          <SummaryStat label="Open P&L" value={formatCompactInr(openPnl)} pnl={openPnl} />
          <SummaryStat label="Total equity" value={formatCompactInr(equity)} accent />
        </div>
      </Panel>

      <Panel title="Open positions" eyebrow="F&O" padded={positions.length === 0}>
        {positions.length === 0 ? (
          <div className="flex flex-col items-center gap-2.5 px-4 py-8 text-center">
            <p className="text-sm font-medium text-[var(--color-text)]">Nothing open right now</p>
            <p className="max-w-xs text-xs text-[var(--color-text-dim)]">
              Positions you take on the option chain will settle here, marked to the latest simulated LTP.
            </p>
            <Link
              to="/app/option-chain"
              className="inline-block border border-[var(--color-amber)]/50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-amber)] hover:bg-[var(--color-amber-soft)]"
            >
              Open the option chain
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="whitespace-nowrap border-b border-[var(--color-border)] text-left text-[11px] uppercase tracking-wide text-[var(--color-text-faint)]">
                  <th className="px-4 py-2">Instrument</th>
                  <th className="px-4 py-2">Expiry</th>
                  <th className="px-4 py-2 text-right">Side</th>
                  <th className="px-4 py-2 text-right">Qty</th>
                  <th className="px-4 py-2 text-right">Avg</th>
                  <th className="px-4 py-2 text-right">LTP</th>
                  <th className="px-4 py-2 text-right">P&amp;L</th>
                  <th className="px-4 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((p) => (
                  <tr key={p.id} className="border-b border-[var(--color-border)]/60 font-mono font-tabular text-[13px]">
                    <td className="px-4 py-2 font-sans text-[var(--color-text)]">
                      {p.underlying} {p.strike} {p.kind}
                    </td>
                    <td className="px-4 py-2 font-sans text-[var(--color-text-dim)]">{p.expiry}</td>
                    <td className={`px-4 py-2 text-right ${p.side === "BUY" ? "text-[var(--color-up)]" : "text-[var(--color-down)]"}`}>
                      {p.side}
                    </td>
                    <td className="px-4 py-2 text-right">{formatNumber(p.lots * p.lotSize)}</td>
                    <td className="px-4 py-2 text-right">{formatInr(p.avgPrice)}</td>
                    <td className="px-4 py-2 text-right">{formatInr(p.ltp)}</td>
                    <td className="px-4 py-2 text-right">
                      <PnlText value={positionPnl(p)} decimals={0} />
                    </td>
                    <td className="px-4 py-2 text-right font-sans">
                      <button
                        onClick={() =>
                          setTicket({
                            underlying: p.underlying,
                            kind: p.kind,
                            strike: p.strike,
                            expiry: p.expiry,
                            marketPrice: p.ltp,
                            lotSize: p.lotSize,
                            side: p.side === "BUY" ? "SELL" : "BUY",
                            lots: p.lots,
                          })
                        }
                        className="min-h-8 border border-[var(--color-border)] px-2.5 py-1 text-xs text-[var(--color-text-dim)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)]"
                      >
                        Close
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel
        title="P&L history"
        eyebrow="Daily equity change · this device only"
        padded={recentDays.length === 0}
      >
        {recentDays.length === 0 ? (
          <div className="flex flex-col items-center gap-2.5 px-4 py-8 text-center">
            <p className="text-sm font-medium text-[var(--color-text)]">No days recorded yet</p>
            <p className="max-w-sm text-xs text-[var(--color-text-dim)]">
              Each day you have the app open gets its own row here, so you can track cumulative P&amp;L
              by month and year. Come back tomorrow to see the first one.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 divide-x divide-[var(--color-border)] border-b border-[var(--color-border)] pb-4">
              <div className="pr-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-faint)]">
                  This month
                </p>
                <PnlText value={monthPnl} decimals={0} className="mt-1 text-lg" />
              </div>
              <div className="pl-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-faint)]">
                  This year
                </p>
                <PnlText value={yearPnl} decimals={0} className="mt-1 text-lg" />
              </div>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[360px] text-sm">
                <thead>
                  <tr className="whitespace-nowrap border-b border-[var(--color-border)] text-left text-[11px] uppercase tracking-wide text-[var(--color-text-faint)]">
                    <th className="py-2">Date</th>
                    <th className="py-2 text-right">Start equity</th>
                    <th className="py-2 text-right">End equity</th>
                    <th className="py-2 text-right">P&amp;L</th>
                  </tr>
                </thead>
                <tbody>
                  {recentDays.map((record) => (
                    <tr key={record.date} className="border-b border-[var(--color-border)]/60 font-mono font-tabular text-[13px]">
                      <td className="py-2 font-sans text-[var(--color-text)]">
                        {record.date === today ? "Today" : record.date}
                      </td>
                      <td className="py-2 text-right text-[var(--color-text-dim)]">
                        {formatCompactInr(record.startEquity)}
                      </td>
                      <td className="py-2 text-right text-[var(--color-text-dim)]">
                        {formatCompactInr(record.endEquity)}
                      </td>
                      <td className="py-2 text-right">
                        <PnlText value={dailyRecordPnl(record)} decimals={0} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-[11px] text-[var(--color-text-faint)]">
              Built from equity samples taken whenever this app was open on this device — a day it was
              never opened has no row, and "start of day" means the first sample taken that day, not a
              true market-open snapshot.
            </p>
          </>
        )}
      </Panel>

      <OrderTicket
        key={ticket ? `${ticket.underlying}-${ticket.kind}-${ticket.strike}-${ticket.expiry}-${ticket.side}` : "closed"}
        context={ticket}
        onClose={() => setTicket(null)}
        onPlaced={setToast}
      />
      <Toast message={toast} onDismiss={() => setToast(null)} />
    </div>
  )
}

function SummaryStat({
  label,
  value,
  accent = false,
  pnl,
}: {
  label: string
  value: string
  accent?: boolean
  pnl?: number
}) {
  const color =
    pnl !== undefined
      ? pnl > 0
        ? "var(--color-up)"
        : pnl < 0
          ? "var(--color-down)"
          : "var(--color-text-dim)"
      : accent
        ? "var(--color-amber)"
        : "var(--color-text)"
  return (
    <div className="px-4 first:pl-0 last:pr-0">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-faint)]">{label}</p>
      <p className="mt-1 font-mono font-tabular text-lg" style={{ color }}>
        {value}
      </p>
    </div>
  )
}
