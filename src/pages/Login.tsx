import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { logIn, signUp, useAuthStore } from "../lib/authClient"
import { Panel } from "../components/Panel"

type Mode = "signin" | "signup"

export default function Login() {
  const navigate = useNavigate()
  const session = useAuthStore((s) => s.session)
  const clearSession = useAuthStore((s) => s.clearSession)
  const [mode, setMode] = useState<Mode>("signin")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (session) {
    return (
      <div className="mx-auto max-w-md space-y-4 py-10">
        <Panel>
          <p className="text-sm text-[var(--color-text)]">
            Signed in as <span className="font-semibold">{session.username}</span>.
          </p>
          <button
            onClick={() => {
              clearSession()
              navigate("/app")
            }}
            className="mt-3 min-h-11 w-full border border-[var(--color-border)] text-sm text-[var(--color-text-dim)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)]"
          >
            Sign out
          </button>
        </Panel>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const result = mode === "signup" ? await signUp(username, password) : await logIn(username, password)
    setBusy(false)
    if (!result.ok) {
      setError(result.error ?? "Something went wrong.")
      return
    }
    navigate("/app")
  }

  return (
    <div className="mx-auto max-w-md space-y-4 py-10">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-faint)]">
          Optional
        </p>
        <h1 className="text-xl font-semibold">{mode === "signup" ? "Create account" : "Sign in"}</h1>
        <p className="mt-1 text-sm text-[var(--color-text-dim)]">
          The app works fully without an account. Signing in persists your portfolio and P&amp;L
          history to your account instead of just this browser.
        </p>
      </div>

      <Panel>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="mb-1.5 block text-xs text-[var(--color-text-dim)]">
              Username
            </label>
            <input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              className="min-h-11 w-full border border-[var(--color-border)] bg-[var(--color-bg-inset)] px-3 font-mono text-[var(--color-text)] outline-none focus-visible:border-[var(--color-amber)]"
              placeholder="3-20 characters: letters, numbers, underscore"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1.5 block text-xs text-[var(--color-text-dim)]">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              className="min-h-11 w-full border border-[var(--color-border)] bg-[var(--color-bg-inset)] px-3 font-mono text-[var(--color-text)] outline-none focus-visible:border-[var(--color-amber)]"
              placeholder="At least 8 characters"
            />
          </div>

          {mode === "signup" && (
            <p className="border border-[var(--color-paper)]/40 bg-[var(--color-paper-dim)] px-3 py-2 text-[11px] text-[var(--color-paper)]">
              There's no email on this account and no way to reset a forgotten password. If you
              lose your username or password, this account and its history can't be recovered.
            </p>
          )}

          {error && <p className="text-sm text-[var(--color-down)]">{error}</p>}

          <button
            type="submit"
            disabled={busy || !username || !password}
            className="min-h-12 w-full bg-[var(--color-amber)] text-sm font-semibold uppercase tracking-wide text-black hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
          </button>
        </form>

        <button
          onClick={() => {
            setMode(mode === "signup" ? "signin" : "signup")
            setError(null)
          }}
          className="mt-4 w-full text-center text-xs text-[var(--color-text-dim)] hover:text-[var(--color-text)]"
        >
          {mode === "signup" ? "Already have an account? Sign in" : "New here? Create an account"}
        </button>
      </Panel>
    </div>
  )
}
