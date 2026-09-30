import { RotateCcw, Settings, User } from "lucide-react"
import { Link } from "react-router-dom"
import { readStoredAdminSecret } from "../lib/adminSecret"
import { useAuthStore } from "../lib/authClient"
import { formatCompactInr } from "../lib/format"
import { positionPnl, usePortfolioStore } from "../lib/store"
import { PnlText } from "./PnlText"

export function Topbar() {
  const cashBalance = usePortfolioStore((s) => s.cashBalance)
  const positions = usePortfolioStore((s) => s.positions)
  const resetAccount = usePortfolioStore((s) => s.resetAccount)
  const session = useAuthStore((s) => s.session)

  const openPnl = positions.reduce((sum, p) => sum + positionPnl(p), 0)
  const equity = cashBalance + positions.reduce((sum, p) => sum + p.ltp * p.lots * p.lotSize, 0)

  // Once the admin secret is remembered on this device (see AdminBroker.tsx),
  // skip straight to the real connect action instead of the intermediate
  // page — the page is only needed the first time, to type it in.
  const rememberedSecret = readStoredAdminSecret()
  const brokerHref = rememberedSecret
    ? `/api/broker/upstox/authorize?secret=${encodeURIComponent(rememberedSecret)}`
    : "/app/admin/broker"

  return (
    <header className="flex items-center justify-between gap-4 border-b border-[var(--color-border)] bg-[var(--color-bg-raised)] px-4 py-3">
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-lg font-semibold tracking-tight text-[var(--color-amber)]">
          पैसा<span className="text-[var(--color-text)]">Paper</span>
        </span>
      </div>

      <div className="flex items-center gap-5">
        <div className="hidden text-right sm:block">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-faint)]">
            Virtual equity
          </p>
          <p className="font-mono font-tabular text-sm text-[var(--color-text)]">
            {formatCompactInr(equity)}
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-faint)]">
            Open P&amp;L
          </p>
          <PnlText value={openPnl} decimals={0} className="text-sm" />
        </div>
        <button
          type="button"
          onClick={() => {
            if (window.confirm("Reset your practice account back to ₹20,00,000 virtual capital? This clears all positions and orders.")) {
              resetAccount()
            }
          }}
          className="flex min-h-9 items-center gap-1.5 border border-[var(--color-border)] px-2.5 py-1.5 text-xs text-[var(--color-text-dim)] transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)]"
        >
          <RotateCcw size={14} strokeWidth={1.75} aria-hidden="true" />
          <span className="hidden sm:inline">Reset account</span>
        </button>
        <Link
          to="/app/login"
          title={session ? `Signed in as ${session.username}` : "Sign in"}
          className="flex min-h-9 items-center gap-1.5 border border-[var(--color-border)] px-2.5 py-1.5 text-xs text-[var(--color-text-dim)] transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)]"
        >
          <User size={14} strokeWidth={1.75} aria-hidden="true" />
          <span className="hidden sm:inline">{session ? session.username : "Sign in"}</span>
        </Link>
        {/* Plain anchor, not <Link> — one branch points at a real API route
            (/api/broker/upstox/authorize), which needs an actual browser
            navigation to hit the server redirect, not client-side routing. */}
        <a
          href={brokerHref}
          title="Broker connection (owner only)"
          aria-label="Broker connection"
          className="flex min-h-9 min-w-9 items-center justify-center border border-[var(--color-border)] text-[var(--color-text-dim)] transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)]"
        >
          <Settings size={14} strokeWidth={1.75} aria-hidden="true" />
        </a>
      </div>
    </header>
  )
}
