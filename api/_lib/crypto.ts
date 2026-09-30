import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "node:crypto"

// AES-256-GCM at-rest encryption for the one broker token we store.
// TOKEN_ENCRYPTION_KEY must be a 32-byte key, base64-encoded.

function getKey(): Buffer {
  const raw = process.env.TOKEN_ENCRYPTION_KEY
  if (!raw) throw new Error("TOKEN_ENCRYPTION_KEY is not set")
  const key = Buffer.from(raw, "base64")
  if (key.length !== 32) {
    throw new Error("TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes (base64-encoded)")
  }
  return key
}

export function encrypt(plaintext: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const authTag = cipher.getAuthTag()
  return [iv, authTag, ciphertext].map((b) => b.toString("base64")).join(".")
}

export function decrypt(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split(".")
  if (!ivB64 || !tagB64 || !dataB64) throw new Error("Malformed encrypted payload")
  const decipher = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivB64, "base64"))
  decipher.setAuthTag(Buffer.from(tagB64, "base64"))
  const plaintext = Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()])
  return plaintext.toString("utf8")
}

// Signed, self-contained OAuth "state" — proves a callback request traces back
// to our own /authorize redirect (which only the admin secret can trigger),
// without needing separate server-side storage for it.
const STATE_TTL_MS = 10 * 60 * 1000

export function signOAuthState(): string {
  const timestamp = Date.now().toString()
  const signature = createHmac("sha256", requireAdminSecret()).update(timestamp).digest("base64url")
  return `${timestamp}.${signature}`
}

export function verifyOAuthState(state: string | undefined): boolean {
  if (!state) return false
  const [timestamp, signature] = state.split(".")
  if (!timestamp || !signature) return false
  if (Date.now() - Number(timestamp) > STATE_TTL_MS) return false
  const expected = createHmac("sha256", requireAdminSecret()).update(timestamp).digest("base64url")
  const a = Buffer.from(signature)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

function requireAdminSecret(): string {
  const secret = process.env.ADMIN_SECRET
  if (!secret) throw new Error("ADMIN_SECRET is not set")
  return secret
}

// General-purpose signed, self-contained token — same HMAC + constant-time-
// compare discipline as the OAuth state above, generalized to carry an
// arbitrary JSON payload and an explicit TTL. Used for user session tokens;
// kept separate from signOAuthState/verifyOAuthState above rather than
// rewriting those in terms of it, so the already-verified OAuth flow isn't
// touched by this change.
export function signPayload<T extends object>(payload: T, secret: string, ttlMs: number): string {
  const body = Buffer.from(JSON.stringify({ ...payload, iat: Date.now(), ttl: ttlMs })).toString("base64url")
  const signature = createHmac("sha256", secret).update(body).digest("base64url")
  return `${body}.${signature}`
}

export function verifyPayload<T>(token: string, secret: string): T | null {
  const [body, signature] = token.split(".")
  if (!body || !signature) return null

  const expected = createHmac("sha256", secret).update(body).digest("base64url")
  const a = Buffer.from(signature)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null

  try {
    const decoded = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as T & { iat: number; ttl: number }
    if (Date.now() - decoded.iat > decoded.ttl) return null
    return decoded
  } catch {
    return null
  }
}
