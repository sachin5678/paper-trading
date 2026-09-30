import { useState } from "react"
import { Panel } from "../components/Panel"
import { readStoredAdminSecret, writeStoredAdminSecret } from "../lib/adminSecret"

// Unlisted from the main sidebar/mobile nav (a Settings icon in the Topbar
// links here instead) — starts the Upstox OAuth connect flow that powers the
// live option chain for every visitor (see PLAN.md "Phase A"). The admin
// secret is the actual gate on /api/broker/upstox/authorize; this page just
// collects it, and remembers it in this browser's own localStorage only —
// never in the app's source or bundle, which anyone could read via
// view-source. That's a real security boundary the secret can't cross, so
// "remembered" still means "typed once per device," not "typed once ever."
export default function AdminBroker() {
  const [secret, setSecret] = useState(readStoredAdminSecret)

  function updateSecret(value: string) {
    setSecret(value)
    writeStoredAdminSecret(value)
  }

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
        <div className="mb-1.5 flex items-center justify-between">
          <label htmlFor="admin-secret" className="text-xs text-[var(--color-text-dim)]">
            Admin secret
          </label>
          {secret && (
            <button
              type="button"
              onClick={() => updateSecret("")}
              className="text-[11px] text-[var(--color-text-faint)] underline-offset-2 hover:text-[var(--color-text-dim)] hover:underline"
            >
              Forget on this device
            </button>
          )}
        </div>
        <input
          id="admin-secret"
          type="password"
          value={secret}
          onChange={(e) => updateSecret(e.target.value)}
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
        <p className="mt-3 text-[11px] text-[var(--color-text-faint)]">
          Remembered on this browser only — never stored in the app itself, so it isn't
          visible to anyone else visiting the site.
        </p>
      </Panel>
    </div>
  )
}
