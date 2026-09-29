import { useEffect, useState } from "react"
import { X } from "lucide-react"
import clsx from "clsx"
import type { OrderType, OrderSide, OptionKind } from "../lib/types"
import { formatInr, formatNumber } from "../lib/format"
import { usePortfolioStore } from "../lib/store"

export interface OrderTicketContext {
  underlying: string
  kind: OptionKind
  strike: number
  expiry: string
  marketPrice: number
  lotSize: number
  side?: OrderSide
  lots?: number
}

interface OrderTicketProps {
  context: OrderTicketContext | null
  onClose: () => void
  onPlaced: (message: string) => void
}

export function OrderTicket({ context, onClose, onPlaced }: OrderTicketProps) {
  const placeOrder = usePortfolioStore((s) => s.placeOrder)
  const [side, setSide] = useState<OrderSide>(context?.side ?? "BUY")
  const [orderType, setOrderType] = useState<OrderType>("MARKET")
  const [lots, setLots] = useState(context?.lots ?? 1)
  const [limitPrice, setLimitPrice] = useState(context?.marketPrice ?? 0)

  const open = context !== null

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    if (open) document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!context) return null

  const price = orderType === "LIMIT" ? limitPrice : context.marketPrice
  const contractSize = lots * context.lotSize
  const totalValue = price * contractSize
  const estMargin = side === "SELL" ? totalValue * 1.35 : totalValue

  function handleSubmit() {
    if (!context) return
    placeOrder({
      underlying: context.underlying,
      kind: context.kind,
      strike: context.strike,
      expiry: context.expiry,
      side,
      orderType,
      lots,
      lotSize: context.lotSize,
      limitPrice: orderType === "LIMIT" ? limitPrice : undefined,
      marketPrice: context.marketPrice,
    })
    onPlaced(
      `${side} ${lots} lot${lots > 1 ? "s" : ""} of ${context.underlying} ${context.strike} ${context.kind} filled at ${formatInr(price)} (simulated).`,
    )
    onClose()
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button
        aria-label="Close order ticket"
        onClick={onClose}
        className="absolute inset-0 bg-black/60"
      />
      <div className="relative flex h-dvh w-full max-w-sm flex-col border-l border-[var(--color-border)] bg-[var(--color-bg-raised)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-faint)]">
              {context.expiry}
            </p>
            <h2 className="font-mono text-base font-semibold text-[var(--color-text)]">
              {context.underlying} {formatNumber(context.strike)} {context.kind}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center text-[var(--color-text-dim)] hover:text-[var(--color-text)]"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-4">
          <div className="grid grid-cols-2 gap-2">
            {(["BUY", "SELL"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSide(s)}
                className={clsx(
                  "min-h-11 border py-2 text-sm font-semibold transition-colors",
                  side === s
                    ? s === "BUY"
                      ? "border-[var(--color-up)] bg-[var(--color-up-dim)] text-[var(--color-up)]"
                      : "border-[var(--color-down)] bg-[var(--color-down-dim)] text-[var(--color-down)]"
                    : "border-[var(--color-border)] text-[var(--color-text-dim)] hover:border-[var(--color-border-strong)]",
                )}
              >
                {s}
              </button>
            ))}
          </div>

          <div>
            <label className="mb-1.5 block text-xs text-[var(--color-text-dim)]">Order type</label>
            <div className="grid grid-cols-2 gap-2">
              {(["MARKET", "LIMIT"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setOrderType(t)}
                  className={clsx(
                    "min-h-10 border py-1.5 text-sm transition-colors",
                    orderType === t
                      ? "border-[var(--color-amber)] text-[var(--color-amber)]"
                      : "border-[var(--color-border)] text-[var(--color-text-dim)] hover:border-[var(--color-border-strong)]",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="lots" className="mb-1.5 block text-xs text-[var(--color-text-dim)]">
              Lots · {context.lotSize} per lot = {formatNumber(contractSize)} qty
            </label>
            <div className="flex items-stretch border border-[var(--color-border)]">
              <button
                type="button"
                aria-label="Decrease lots"
                onClick={() => setLots((n) => Math.max(1, n - 1))}
                className="min-h-11 w-11 shrink-0 text-lg text-[var(--color-text-dim)] hover:bg-[var(--color-bg-hover)]"
              >
                −
              </button>
              <input
                id="lots"
                type="number"
                min={1}
                value={lots}
                onChange={(e) => setLots(Math.max(1, Number(e.target.value) || 1))}
                className="w-full bg-transparent text-center font-mono font-tabular text-[var(--color-text)] outline-none"
              />
              <button
                type="button"
                aria-label="Increase lots"
                onClick={() => setLots((n) => n + 1)}
                className="min-h-11 w-11 shrink-0 text-lg text-[var(--color-text-dim)] hover:bg-[var(--color-bg-hover)]"
              >
                +
              </button>
            </div>
          </div>

          {orderType === "LIMIT" && (
            <div>
              <label htmlFor="limitPrice" className="mb-1.5 block text-xs text-[var(--color-text-dim)]">
                Limit price
              </label>
              <input
                id="limitPrice"
                type="number"
                step="0.05"
                value={limitPrice}
                onChange={(e) => setLimitPrice(Number(e.target.value) || 0)}
                className="min-h-11 w-full border border-[var(--color-border)] bg-[var(--color-bg-inset)] px-3 font-mono font-tabular text-[var(--color-text)] outline-none focus-visible:border-[var(--color-amber)]"
              />
            </div>
          )}

          <dl className="space-y-2 border-t border-[var(--color-border)] pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-[var(--color-text-dim)]">LTP</dt>
              <dd className="font-mono font-tabular">{formatInr(context.marketPrice)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--color-text-dim)]">{side === "BUY" ? "Premium outlay" : "Premium credit"}</dt>
              <dd className="font-mono font-tabular">{formatInr(totalValue)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--color-text-dim)]">Est. margin (simulated)</dt>
              <dd className="font-mono font-tabular">{formatInr(estMargin)}</dd>
            </div>
          </dl>
        </div>

        <div className="border-t border-[var(--color-border)] p-4">
          <button
            onClick={handleSubmit}
            className={clsx(
              "min-h-12 w-full text-sm font-semibold uppercase tracking-wide transition-colors",
              side === "BUY"
                ? "bg-[var(--color-up)] text-black hover:brightness-110"
                : "bg-[var(--color-down)] text-black hover:brightness-110",
            )}
          >
            {side} {context.underlying} {context.kind} · {formatInr(price)}
          </button>
          <p className="mt-2 text-center text-[11px] text-[var(--color-text-faint)]">
            Simulated fill. No real order is sent to NSE or BSE.
          </p>
        </div>
      </div>
    </div>
  )
}
