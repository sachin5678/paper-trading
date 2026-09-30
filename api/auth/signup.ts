import type { VercelRequest, VercelResponse } from "@vercel/node"
import { getDb, type AppUserRow } from "../_lib/db.js"
import { hashPassword, isValidPassword, isValidUsername, issueSessionToken } from "../_lib/auth.js"

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" })
    return
  }

  const { username, password } = (req.body ?? {}) as { username?: string; password?: string }

  if (!username || !isValidUsername(username)) {
    res.status(400).json({ error: "Username must be 3-20 characters: letters, numbers, underscore only." })
    return
  }
  if (!password || !isValidPassword(password)) {
    res.status(400).json({ error: "Password must be at least 8 characters." })
    return
  }

  try {
    const sql = getDb()
    const existing = await sql<Pick<AppUserRow, "id">[]>`
      select id from app_users where username = ${username}
    `
    if (existing.length > 0) {
      res.status(409).json({ error: "That username is already taken." })
      return
    }

    const [created] = await sql<Pick<AppUserRow, "id" | "username">[]>`
      insert into app_users (username, password_hash)
      values (${username}, ${hashPassword(password)})
      returning id, username
    `

    const token = issueSessionToken({ userId: created.id, username: created.username })
    res.status(201).json({ token, username: created.username })
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
}
