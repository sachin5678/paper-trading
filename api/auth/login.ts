import type { VercelRequest, VercelResponse } from "@vercel/node"
import { getDb, type AppUserRow } from "../_lib/db.js"
import { verifyPassword, issueSessionToken } from "../_lib/auth.js"

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" })
    return
  }

  const { username, password } = (req.body ?? {}) as { username?: string; password?: string }
  if (!username || !password) {
    res.status(400).json({ error: "Username and password are required." })
    return
  }

  try {
    const sql = getDb()
    const [user] = await sql<Pick<AppUserRow, "id" | "username" | "password_hash">[]>`
      select id, username, password_hash from app_users where username = ${username}
    `

    // Same generic message whether the username doesn't exist or the
    // password is wrong — don't reveal which one it was.
    if (!user || !verifyPassword(password, user.password_hash)) {
      res.status(401).json({ error: "Incorrect username or password." })
      return
    }

    const token = issueSessionToken({ userId: user.id, username: user.username })
    res.status(200).json({ token, username: user.username })
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
}
