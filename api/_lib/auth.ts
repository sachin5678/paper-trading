import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto"
import type { VercelRequest } from "@vercel/node"
import { signPayload, verifyPayload } from "./crypto.js"

// No email in this system (explicit product decision — username/password
// only, which also means no password recovery is possible; that's stated to
// the user in the signup UI, not hidden). scrypt is a built-in Node KDF, so
// this needs no extra dependency, same philosophy as reusing node:crypto for
// the Upstox token encryption.
const SCRYPT_KEYLEN = 64

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex")
  const derivedKey = scryptSync(password, salt, SCRYPT_KEYLEN).toString("hex")
  return `${salt}:${derivedKey}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, storedKeyHex] = stored.split(":")
  if (!salt || !storedKeyHex) return false
  const derivedKey = scryptSync(password, salt, SCRYPT_KEYLEN)
  const storedKey = Buffer.from(storedKeyHex, "hex")
  return derivedKey.length === storedKey.length && timingSafeEqual(derivedKey, storedKey)
}

export function isValidUsername(username: string): boolean {
  return /^[a-zA-Z0-9_]{3,20}$/.test(username)
}

export function isValidPassword(password: string): boolean {
  return password.length >= 8
}

export interface SessionPayload {
  userId: string
  username: string
}

// Stateless — no server-side session table, so there's nothing to revoke on
// "log out everywhere." Accepted limitation for a personal-use tool.
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000

export function issueSessionToken(payload: SessionPayload): string {
  return signPayload(payload, requireSessionSecret(), SESSION_TTL_MS)
}

export function verifySessionToken(token: string | undefined): SessionPayload | null {
  if (!token) return null
  return verifyPayload<SessionPayload>(token, requireSessionSecret())
}

export function getBearerToken(req: VercelRequest): string | undefined {
  const header = req.headers.authorization
  if (!header?.startsWith("Bearer ")) return undefined
  return header.slice("Bearer ".length)
}

function requireSessionSecret(): string {
  const secret = process.env.SESSION_SECRET
  if (!secret) throw new Error("SESSION_SECRET is not set")
  return secret
}
