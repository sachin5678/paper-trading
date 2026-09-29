import { LayoutGrid, ListChecks, Newspaper, Wallet, Grid3x3 } from "lucide-react"
import { NavLink } from "react-router-dom"
import clsx from "clsx"

const NAV = [
  { to: "/app", label: "Dashboard", icon: LayoutGrid, end: true },
  { to: "/app/watchlist", label: "Watchlist", icon: ListChecks },
  { to: "/app/option-chain", label: "Option Chain", icon: Grid3x3 },
  { to: "/app/portfolio", label: "Portfolio", icon: Wallet },
  { to: "/app/orders", label: "Orders", icon: Newspaper },
]

export function Sidebar() {
  return (
    <nav
      aria-label="Primary"
      className="hidden w-56 shrink-0 border-r border-[var(--color-border)] bg-[var(--color-bg-raised)] md:flex md:flex-col"
    >
      <div className="flex flex-col gap-0.5 p-3">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              clsx(
                "flex items-center gap-3 px-3 py-2 text-sm transition-colors duration-150",
                isActive
                  ? "border-l-2 border-[var(--color-amber)] bg-[var(--color-amber-soft)] text-[var(--color-amber)]"
                  : "border-l-2 border-transparent text-[var(--color-text-dim)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text)]",
              )
            }
          >
            <Icon size={17} strokeWidth={1.75} aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </div>
      <div className="mt-auto p-4 text-[11px] leading-relaxed text-[var(--color-text-faint)]">
        Quotes and fills are simulated for practice. No real orders reach NSE or BSE.
      </div>
    </nav>
  )
}
