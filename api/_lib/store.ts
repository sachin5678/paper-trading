import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { decrypt, encrypt } from "./crypto"

export interface StoredUpstoxToken {
  accessToken: string
  expiresAt: number
}

interface TokenRecord {
  encrypted: string
  expiresAt: number
}

const KV_KEY = "upstox:owner-token"

// Vercel KV (Upstash Redis) in production; a local gitignored JSON file when
// no KV integration is configured, so `npm run dev` works with zero external
// accounts. Same call sites either way — callers never branch on which one.
const useKv = Boolean(process.env.KV_REST_API_URL)

const LOCAL_STORE_PATH = path.join(process.cwd(), ".local-data", "token-store.json")

async function readLocalStore(): Promise<Record<string, TokenRecord>> {
  try {
    const raw = await readFile(LOCAL_STORE_PATH, "utf8")
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

async function writeLocalStore(data: Record<string, TokenRecord>): Promise<void> {
  await mkdir(path.dirname(LOCAL_STORE_PATH), { recursive: true })
  await writeFile(LOCAL_STORE_PATH, JSON.stringify(data, null, 2), "utf8")
}

async function kvGet(key: string): Promise<TokenRecord | null> {
  const { kv } = await import("@vercel/kv")
  const value = await kv.get<TokenRecord>(key)
  return value ?? null
}

async function kvSet(key: string, value: TokenRecord): Promise<void> {
  const { kv } = await import("@vercel/kv")
  await kv.set(key, value)
}

export async function getUpstoxToken(): Promise<StoredUpstoxToken | null> {
  const record = useKv ? await kvGet(KV_KEY) : (await readLocalStore())[KV_KEY]
  if (!record) return null
  return { accessToken: decrypt(record.encrypted), expiresAt: record.expiresAt }
}

export async function setUpstoxToken(accessToken: string, expiresAt: number): Promise<void> {
  const record: TokenRecord = { encrypted: encrypt(accessToken), expiresAt }
  if (useKv) {
    await kvSet(KV_KEY, record)
    return
  }
  const store = await readLocalStore()
  store[KV_KEY] = record
  await writeLocalStore(store)
}
