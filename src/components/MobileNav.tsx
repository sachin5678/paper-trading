import { LayoutGrid, ListChecks, Newspaper, Wallet, Grid3x3, LineChart } from "lucide-react"
import { NavLink } from "react-router-dom"
import clsx from "clsx"

const NAV = [
  { to: "/app", label: "Dashboard", icon: LayoutGrid, end: true },
  { to: "/app/watchlist", label: "Watchlist", icon: ListChecks },
  { to: "/app/option-chain", label: "Chain", icon: Grid3x3 },
  { to: "/app/portfolio", label: "Portfolio", icon: Wallet },
  { to: "/app/orders", label: "Orders", icon: Newspaper },
  { to: "/app/mtm", label: "MTM", icon: LineChart },
]

export function MobileNav() {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 flex border-t border-[var(--color-border)] bg-[var(--color-bg-raised)] md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {NAV.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            clsx(
              "flex min-h-11 flex-1 flex-col items-center gap-1 py-2 text-[10px]",
              isActive ? "text-[var(--color-amber)]" : "text-[var(--color-text-faint)]",
            )
          }
        >
          <Icon size={19} strokeWidth={1.75} aria-hidden="true" />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
