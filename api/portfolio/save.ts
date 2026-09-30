import type { VercelRequest, VercelResponse } from "@vercel/node"
import { getBearerToken, verifySessionToken } from "../_lib/auth.js"
import { getDb } from "../_lib/db.js"
import type postgres from "postgres"

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" })
    return
  }

  const session = verifySessionToken(getBearerToken(req))
  if (!session) {
    res.status(401).json({ error: "Not signed in." })
    return
  }

  const { state } = (req.body ?? {}) as { state?: unknown }
  if (state === undefined) {
    res.status(400).json({ error: "Missing state." })
    return
  }

  try {
    const sql = getDb()
    await sql`
      insert into portfolios (user_id, state, updated_at)
      values (${session.userId}, ${sql.json(state as postgres.JSONValue)}, now())
      on conflict (user_id) do update set state = excluded.state, updated_at = excluded.updated_at
    `
    res.status(200).json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
}
