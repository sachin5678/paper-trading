import { useEffect, useMemo, useState, type ReactNode } from "react"
import clsx from "clsx"
import { UNDERLYINGS, buildOptionChain, upcomingExpiries } from "../lib/marketData"
import { useLiveTicks } from "../lib/useLiveTicks"
import { fetchLiveOptionChain, type OptionChainFeed } from "../lib/api"
import { formatNumber, formatInr } from "../lib/format"
import { Panel } from "../components/Panel"
import { PnlPercent } from "../components/PnlText"
import { FeedBadge } from "../components/FeedBadge"
import { OrderTicket, type OrderTicketContext } from "../components/OrderTicket"
import { Toast } from "../components/Toast"

const EXPIRIES = upcomingExpiries(3)
// The live feed always serves the nearest real expiry (resolved server-side
// against Upstox's contract calendar), which only lines up with our first,
// synthetic "current week" tab. Other tabs stay simulated-only for this phase.
const LIVE_FEED_POLL_MS = 4000

export default function OptionChain() {
  const [underlyingSymbol, setUnderlyingSymbol] = useState(UNDERLYINGS[0].symbol)
  const [expiry, setExpiry] = useState(EXPIRIES[0])
  const [ticket, setTicket] = useState<OrderTicketContext | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [feed, setFeed] = useState<OptionChainFeed | null>(null)
  // While live, the price first seen this session — used as the change%
  // basis since we don't have the broker's previous-close for the underlying
  // (a separate API call, out of scope for this phase). Reset whenever the
  // underlying or tab changes, alongside `feed`, in the same effect below.
  const [sessionOpenPrice, setSessionOpenPrice] = useState<number | null>(null)

  const underlyingBase = UNDERLYINGS.find((u) => u.symbol === underlyingSymbol)!
  const [simulatedLive] = useLiveTicks([underlyingBase], 2200)
  const isCurrentWeekTab = expiry === EXPIRIES[0]

  useEffect(() => {
    setFeed(null)
    setSessionOpenPrice(null)
    if (!isCurrentWeekTab) return
    let cancelled = false
    async function poll() {
      const result = await fetchLiveOptionChain(underlyingSymbol)
      if (cancelled) return
      setFeed(result)
      if (result.source === "live") {
        setSessionOpenPrice((prev) => prev ?? result.underlyingLtp)
      }
    }
    poll()
    const id = window.setInterval(poll, LIVE_FEED_POLL_MS)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [underlyingSymbol, isCurrentWeekTab])

  const isLive = feed?.source === "live"

  const underlying = simulatedLive ?? underlyingBase
  const simulatedChain = useMemo(() => buildOptionChain(underlying, expiry), [underlying, expiry])

  const chain = isLive ? feed.rows : simulatedChain
  const spotPrice = isLive ? feed.underlyingLtp : underlying.ltp
  // Live lot size comes straight from Upstox's contract data — NSE revises
  // these periodically, and our static UNDERLYINGS config is only accurate
  // for simulated mode.
  const lotSize = isLive ? feed.lotSize : underlying.lotSize
  const changeBasis = isLive ? (sessionOpenPrice ?? spotPrice) : underlying.prevClose
  const change = spotPrice - changeBasis
  const changePct = (change / changeBasis) * 100

  return (
    <div className="space-y-4">
      <Panel padded={false}>
        <div className="flex flex-wrap items-center justify-between gap-4 p-4">
          <div className="flex items-center gap-4">
            <div>
              <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-faint)]">
                {underlying.exchange} · Option Chain
                {isCurrentWeekTab && <FeedBadge source={isLive ? "live" : "simulated"} />}
              </p>
              <h1 className="font-mono text-2xl font-semibold tracking-tight">{underlying.symbol}</h1>
            </div>
            <div>
              <p className="font-mono font-tabular text-2xl" style={{ color: change >= 0 ? "var(--color-up)" : "var(--color-down)" }}>
                {formatNumber(spotPrice, 2)}
              </p>
              <PnlPercent value={changePct} className="text-xs" />
              {isLive && <p className="text-[10px] text-[var(--color-text-faint)]">since you opened this page</p>}
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <TabGroup
              label="Underlying"
              options={UNDERLYINGS.map((u) => u.symbol)}
              value={underlyingSymbol}
              onChange={setUnderlyingSymbol}
            />
            <TabGroup label="Expiry" options={EXPIRIES} value={expiry} onChange={setExpiry} />
          </div>
        </div>
      </Panel>

      <Panel padded={false} title="Calls (CE) — Strike — Puts (PE)" eyebrow="Lot size" action={
        <span className="font-mono text-xs text-[var(--color-text-dim)]">{lotSize} / lot</span>
      }>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] border-collapse text-right text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[11px] uppercase tracking-wide text-[var(--color-text-faint)]">
                <Th>OI</Th>
                <Th>Chg OI%</Th>
                <Th>Vol</Th>
                <Th>IV</Th>
                <Th>LTP</Th>
                <th className="px-3 py-2 text-center">Strike</th>
                <Th align="left">LTP</Th>
                <Th align="left">IV</Th>
                <Th align="left">Vol</Th>
                <Th align="left">Chg OI%</Th>
                <Th align="left">OI</Th>
              </tr>
            </thead>
            <tbody>
              {chain.map((row) => {
                const isAtm = Math.abs(row.strike - spotPrice) < underlying.strikeStep / 2
                return (
                  <tr
                    key={row.strike}
                    className={clsx(
                      "border-b border-[var(--color-border)]/60 font-mono font-tabular text-[13px]",
                      isAtm && "bg-[var(--color-amber-soft)]",
                    )}
                  >
                    <Td dim={!row.call.inTheMoney}>{formatNumber(row.call.oi)}</Td>
                    <Td>
                      <PnlPercent value={row.call.oiChangePct} />
                    </Td>
                    <Td dim>{formatNumber(row.call.volume)}</Td>
                    <Td dim>{row.call.iv.toFixed(1)}</Td>
                    <Td>
                      <LtpButton
                        price={row.call.ltp}
                        prevClose={row.call.prevClose}
                        onClick={() =>
                          setTicket({
                            underlying: underlying.symbol,
                            kind: "CE",
                            strike: row.strike,
                            expiry: row.expiry,
                            marketPrice: row.call.ltp,
                            lotSize,
                            side: "BUY",
                          })
                        }
                      />
                    </Td>
                    <td
                      className={clsx(
                        "px-3 py-2 text-center font-semibold",
                        isAtm ? "text-[var(--color-amber)]" : "text-[var(--color-text)]",
                      )}
                    >
                      {formatNumber(row.strike)}
                    </td>
                    <Td align="left">
                      <LtpButton
                        align="left"
                        price={row.put.ltp}
                        prevClose={row.put.prevClose}
                        onClick={() =>
                          setTicket({
                            underlying: underlying.symbol,
                            kind: "PE",
                            strike: row.strike,
                            expiry: row.expiry,
                            marketPrice: row.put.ltp,
                            lotSize,
                            side: "BUY",
                          })
                        }
                      />
                    </Td>
                    <Td align="left" dim>
                      {row.put.iv.toFixed(1)}
                    </Td>
                    <Td align="left" dim>
                      {formatNumber(row.put.volume)}
                    </Td>
                    <Td align="left">
                      <PnlPercent value={row.put.oiChangePct} />
                    </Td>
                    <Td align="left" dim={!row.put.inTheMoney}>
                      {formatNumber(row.put.oi)}
                    </Td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
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

function TabGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: string[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-faint)]">{label}</p>
      <div className="flex border border-[var(--color-border)]">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={clsx(
              "min-h-9 border-r border-[var(--color-border)] px-3 text-xs font-medium last:border-r-0",
              value === opt
                ? "bg-[var(--color-amber-soft)] text-[var(--color-amber)]"
                : "text-[var(--color-text-dim)] hover:bg-[var(--color-bg-hover)]",
            )}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}

function Th({ children, align = "right" }: { children: ReactNode; align?: "left" | "right" }) {
  return <th className={clsx("px-3 py-2", align === "left" ? "text-left" : "text-right")}>{children}</th>
}

function Td({
  children,
  align = "right",
  dim = false,
}: {
  children: ReactNode
  align?: "left" | "right"
  dim?: boolean
}) {
  return (
    <td
      className={clsx(
        "px-3 py-2",
        align === "left" ? "text-left" : "text-right",
        dim ? "text-[var(--color-text-faint)]" : "text-[var(--color-text)]",
      )}
    >
      {children}
    </td>
  )
}

function LtpButton({
  price,
  prevClose,
  onClick,
  align = "right",
}: {
  price: number
  prevClose: number
  onClick: () => void
  align?: "left" | "right"
}) {
  const up = price >= prevClose
  return (
    <button
      onClick={onClick}
      className={clsx(
        "min-h-8 px-2 py-1 font-semibold underline-offset-4 hover:underline",
        align === "left" ? "text-left" : "text-right",
      )}
      style={{ color: up ? "var(--color-up)" : "var(--color-down)" }}
      title={`Trade ${formatInr(price)}`}
    >
      {formatNumber(price, 2)}
    </button>
  )
}
