import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface Session {
  token: string
  username: string
}

interface AuthState {
  session: Session | null
  setSession: (session: Session) => void
  clearSession: () => void
}

// A small reactive store (same persist pattern as usePortfolioStore) rather
// than plain localStorage reads/writes, so Topbar, the Login page, and
// PortfolioSyncEngine all see login/logout instantly without polling.
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      session: null,
      setSession: (session) => set({ session }),
      clearSession: () => set({ session: null }),
    }),
    { name: "paisa-paper-session" },
  ),
)

interface AuthResult {
  ok: boolean
  error?: string
}

async function postAuth(path: string, username: string, password: string): Promise<AuthResult> {
  try {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    })
    const json = (await res.json()) as { token?: string; username?: string; error?: string }
    if (!res.ok || !json.token || !json.username) {
      return { ok: false, error: json.error ?? "Something went wrong." }
    }
    useAuthStore.getState().setSession({ token: json.token, username: json.username })
    return { ok: true }
  } catch {
    return { ok: false, error: "Could not reach the server." }
  }
}

export function signUp(username: string, password: string): Promise<AuthResult> {
  return postAuth("/api/auth/signup", username, password)
}

export function logIn(username: string, password: string): Promise<AuthResult> {
  return postAuth("/api/auth/login", username, password)
}

export function logOut(): void {
  useAuthStore.getState().clearSession()
}
