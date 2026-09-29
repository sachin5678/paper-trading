import { formatInr, formatNumber } from "../lib/format"
import { usePortfolioStore } from "../lib/store"
import { Panel } from "../components/Panel"

export default function Orders() {
  const orders = usePortfolioStore((s) => s.orders)

  return (
    <div className="space-y-4">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-faint)]">
          Simulated fills
        </p>
        <h1 className="text-xl font-semibold">Order book</h1>
      </div>

      <Panel padded={orders.length === 0}>
        {orders.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <p className="text-sm font-medium text-[var(--color-text)]">No orders yet</p>
            <p className="max-w-xs text-xs text-[var(--color-text-dim)]">
              Every simulated trade you place on the option chain is logged here with a timestamp and fill price.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-left text-[11px] uppercase tracking-wide text-[var(--color-text-faint)]">
                  <th className="px-4 py-2">Time</th>
                  <th className="px-4 py-2">Instrument</th>
                  <th className="px-4 py-2">Expiry</th>
                  <th className="px-4 py-2 text-right">Side</th>
                  <th className="px-4 py-2 text-right">Type</th>
                  <th className="px-4 py-2 text-right">Qty</th>
                  <th className="px-4 py-2 text-right">Price</th>
                  <th className="px-4 py-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-b border-[var(--color-border)]/60 font-mono font-tabular text-[13px]">
                    <td className="px-4 py-2 font-sans text-[var(--color-text-dim)]">
                      {new Date(o.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </td>
                    <td className="px-4 py-2 font-sans text-[var(--color-text)]">
                      {o.underlying} {o.strike} {o.kind}
                    </td>
                    <td className="px-4 py-2 font-sans text-[var(--color-text-dim)]">{o.expiry}</td>
                    <td className={`px-4 py-2 text-right ${o.side === "BUY" ? "text-[var(--color-up)]" : "text-[var(--color-down)]"}`}>
                      {o.side}
                    </td>
                    <td className="px-4 py-2 text-right font-sans text-[var(--color-text-dim)]">{o.orderType}</td>
                    <td className="px-4 py-2 text-right">{formatNumber(o.lots * o.lotSize)}</td>
                    <td className="px-4 py-2 text-right">{formatInr(o.price)}</td>
                    <td className="px-4 py-2 text-right font-sans text-[var(--color-up)]">{o.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  )
}
