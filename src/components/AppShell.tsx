import { Outlet } from "react-router-dom"
import { Sidebar } from "./Sidebar"
import { Topbar } from "./Topbar"
import { TickerRibbon } from "./TickerRibbon"
import { MobileNav } from "./MobileNav"
import { MarkToMarketEngine } from "./MarkToMarketEngine"
import { DailyPnlEngine } from "./DailyPnlEngine"

export function AppShell() {
  return (
    <div className="flex min-h-dvh flex-col bg-[var(--color-bg)]">
      <MarkToMarketEngine />
      <DailyPnlEngine />
      <Topbar />
      <TickerRibbon />
      <div className="flex flex-1">
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-x-hidden p-4 pb-20 md:pb-4">
          <Outlet />
        </main>
      </div>
      <MobileNav />
    </div>
  )
}
