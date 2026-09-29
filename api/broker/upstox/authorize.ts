import type { VercelRequest, VercelResponse } from "@vercel/node"
import { signOAuthState } from "../../_lib/crypto"
import { buildAuthorizeUrl } from "../../_lib/upstox"

// Owner-only: starts the Upstox OAuth dialog. Gated by a shared secret so a
// random visitor can't reconnect (or hijack) the site's one broker link. The
// signed `state` we hand Upstox lets /callback verify the redirect really
// traces back to this admin-gated entry point.
export default function handler(req: VercelRequest, res: VercelResponse) {
  const adminSecret = process.env.ADMIN_SECRET
  if (!adminSecret || req.query.secret !== adminSecret) {
    res.status(403).json({ error: "Forbidden" })
    return
  }

  try {
    res.writeHead(302, { Location: buildAuthorizeUrl(signOAuthState()) })
    res.end()
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
}
