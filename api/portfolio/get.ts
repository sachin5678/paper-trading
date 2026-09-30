import type { VercelRequest, VercelResponse } from "@vercel/node"
import { getBearerToken, verifySessionToken } from "../_lib/auth.js"
import { getDb, type PortfolioRow } from "../_lib/db.js"

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const session = verifySessionToken(getBearerToken(req))
  if (!session) {
    res.status(401).json({ error: "Not signed in." })
    return
  }

  try {
    const sql = getDb()
    const [row] = await sql<Pick<PortfolioRow, "state">[]>`
      select state from portfolios where user_id = ${session.userId}
    `

    // No row yet is a normal, expected state for a brand-new account — not
    // an error the client needs to unwrap.
    res.status(200).json({ state: row?.state ?? null })
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
}
