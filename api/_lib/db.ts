import postgres from "postgres"

export interface AppUserRow {
  id: string
  username: string
  password_hash: string
  created_at: string
}

export interface PortfolioRow {
  user_id: string
  state: unknown
  updated_at: string
}

let cached: ReturnType<typeof postgres> | null = null

export function getDb() {
  if (cached) return cached
  const url = process.env.DATABASE_URL
  if (!url) throw new Error("DATABASE_URL is not set")
  cached = postgres(url, { ssl: "require" })
  return cached
}
