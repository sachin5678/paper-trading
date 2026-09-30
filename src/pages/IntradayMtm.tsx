import { Panel } from "../components/Panel"
import { MtmChart } from "../components/MtmChart"
import { PnlPercent, PnlText } from "../components/PnlText"
import { formatCompactInr } from "../lib/format"
import { dailyRecordPnl, usePortfolioStore } from "../lib/store"
import { useTodayDateString } from "../lib/useToday"

export default function IntradayMtm() {
  const cashBalance = usePortfolioStore((s) => s.cashBalance)
  const positions = usePortfolioStore((s) => s.positions)
  const dailyPnlHistory = usePortfolioStore((s) => s.dailyPnlHistory)
  const todayIntradayPoints = usePortfolioStore((s) => s.todayIntradayPoints)
  const today = useTodayDateString()

  const equity = cashBalance + positions.reduce((sum, p) => sum + p.ltp * p.lots * p.lotSize, 0)
  const todayRecord = dailyPnlHistory.find((r) => r.date === today)
  const startEquity = todayRecord?.startEquity ?? equity
  const todayPnl = todayRecord ? dailyRecordPnl(todayRecord) : 0
  const todayPnlPct = startEquity !== 0 ? (todayPnl / startEquity) * 100 : 0

  const series = todayIntradayPoints.map((p) => p.equity - startEquity)
  const dayHigh = series.length > 0 ? Math.max(...series) : 0
  const dayLow = series.length > 0 ? Math.min(...series) : 0

  return (
    <div className="space-y-4">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-faint)]">
          Today · minute by minute
        </p>
        <h1 className="text-xl font-semibold text-[var(--color-text)]">Intraday MTM</h1>
      </div>

      <Panel padded={false}>
        <div className="grid grid-cols-2 divide-x divide-y divide-[var(--color-border)] border-b border-[var(--color-border)] sm:grid-cols-4 sm:divide-y-0">
          <Stat label="Today's P&L">
            <PnlText value={todayPnl} decimals={0} className="text-lg" />
            <PnlPercent value={todayPnlPct} className="text-[11px]" />
          </Stat>
          <Stat label="Day high">
            <PnlText value={dayHigh} decimals={0} className="text-lg" />
          </Stat>
          <Stat label="Day low">
            <PnlText value={dayLow} decimals={0} className="text-lg" />
          </Stat>
          <Stat label="Current equity">
            <span className="font-mono font-tabular text-lg text-[var(--color-text)]">{formatCompactInr(equity)}</span>
          </Stat>
        </div>
        <div className="p-4">
          <MtmChart points={todayIntradayPoints} startEquity={startEquity} height={420} />
        </div>
      </Panel>

      <p className="text-[11px] leading-relaxed text-[var(--color-text-faint)]">
        Device-only: built from equity samples taken whenever this app was open on this device. A day it was never
        opened leaves no chart, and "start of day" means the first sample taken that day, not a true market-open
        snapshot. Hover the chart for the exact P&amp;L at any point today.
      </p>
    </div>
  )
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-faint)]">{label}</p>
      <div className="mt-1">{children}</div>
    </div>
  )
}
