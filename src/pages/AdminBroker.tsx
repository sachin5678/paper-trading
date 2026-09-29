import { useState } from "react"
import { Panel } from "../components/Panel"

// Unlisted owner-only utility page — not in the sidebar or mobile nav. Starts
// the Upstox OAuth connect flow that powers the live option chain for every
// visitor (see PLAN.md "Phase A"). The admin secret gates the actual
// /api/broker/upstox/authorize redirect; this page just collects it.
export default function AdminBroker() {
  const [secret, setSecret] = useState("")

  return (
    <div className="mx-auto max-w-md space-y-4 py-10">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-faint)]">
          Owner only
        </p>
        <h1 className="text-xl font-semibold">Broker connection</h1>
        <p className="mt-1 text-sm text-[var(--color-text-dim)]">
          Connects the site's one Upstox account so every visitor sees a live option
          chain. Upstox tokens expire daily around 3:30am IST — reconnect here each
          trading day.
        </p>
      </div>

      <Panel>
        <label htmlFor="admin-secret" className="mb-1.5 block text-xs text-[var(--color-text-dim)]">
          Admin secret
        </label>
        <input
          id="admin-secret"
          type="password"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          className="min-h-11 w-full border border-[var(--color-border)] bg-[var(--color-bg-inset)] px-3 font-mono text-[var(--color-text)] outline-none focus-visible:border-[var(--color-amber)]"
          placeholder="ADMIN_SECRET"
          autoComplete="off"
        />
        <a
          href={secret ? `/api/broker/upstox/authorize?secret=${encodeURIComponent(secret)}` : undefined}
          aria-disabled={!secret}
          className={
            "mt-3 block min-h-12 w-full border py-3 text-center text-sm font-semibold uppercase tracking-wide transition-colors " +
            (secret
              ? "border-[var(--color-amber)] bg-[var(--color-amber)] text-black hover:brightness-110"
              : "cursor-not-allowed border-[var(--color-border)] text-[var(--color-text-faint)]")
          }
          onClick={(e) => {
            if (!secret) e.preventDefault()
          }}
        >
          Connect Upstox
        </a>
      </Panel>
    </div>
  )
}
