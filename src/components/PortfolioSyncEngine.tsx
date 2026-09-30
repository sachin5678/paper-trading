import { useEffect, useRef } from "react"
import { useAuthStore } from "../lib/authClient"
import { usePortfolioStore } from "../lib/store"

const SAVE_DEBOUNCE_MS = 2500

// Renders nothing — mounted once in AppShell. Bridges the existing
// localStorage-backed usePortfolioStore to a signed-in account, without
// changing any of that store's trade-execution logic: this only decides
// *where* the same state additionally gets persisted.
//
// On login (including "already logged in" at app load): fetches the
// account's saved state. An existing account's remote state wins (you're
// signing in on a new device — nothing local to preserve). A brand-new
// account has no state yet, so whatever's already in the local store
// (including anonymous practice trading done before signing up) gets
// uploaded as-is, rather than silently discarded.
//
// While signed in: debounce-saves on every store change. Logging out just
// stops syncing — local state is left exactly as it is, reverting to being
// this browser's anonymous copy.
export function PortfolioSyncEngine() {
  const session = useAuthStore((s) => s.session)
  const isApplyingRemote = useRef(false)
  const saveTimeout = useRef<number | null>(null)

  useEffect(() => {
    if (!session) return
    let cancelled = false

    async function saveNow() {
      // JSON round-trip drops the store's action functions (they aren't
      // valid JSON) — same effect as the localStorage persist middleware's
      // own serialization, applied manually since this write goes over
      // fetch instead of through zustand/persist.
      const snapshot = JSON.parse(JSON.stringify(usePortfolioStore.getState()))
      try {
        await fetch("/api/portfolio/save", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session!.token}` },
          body: JSON.stringify({ state: snapshot }),
        })
      } catch {
        // Best-effort — the next store change will retry via the debounce.
      }
    }

    async function hydrate() {
      try {
        const res = await fetch("/api/portfolio/get", {
          headers: { Authorization: `Bearer ${session!.token}` },
        })
        const json = (await res.json()) as { state: Record<string, unknown> | null }
        if (cancelled) return

        if (json.state) {
          isApplyingRemote.current = true
          usePortfolioStore.setState(json.state)
          isApplyingRemote.current = false
        } else {
          await saveNow()
        }
      } catch {
        // Network hiccup on load — keep using local state; the debounced
        // save below will still fire on the next change and can succeed then.
      }
    }

    hydrate()

    const unsubscribe = usePortfolioStore.subscribe(() => {
      if (isApplyingRemote.current) return
      if (saveTimeout.current) window.clearTimeout(saveTimeout.current)
      saveTimeout.current = window.setTimeout(saveNow, SAVE_DEBOUNCE_MS)
    })

    return () => {
      cancelled = true
      unsubscribe()
      if (saveTimeout.current) window.clearTimeout(saveTimeout.current)
    }
  }, [session])

  return null
}
