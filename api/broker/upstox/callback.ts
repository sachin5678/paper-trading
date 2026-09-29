import type { VercelRequest, VercelResponse } from "@vercel/node"
import { verifyOAuthState } from "../../_lib/crypto.js"
import { setUpstoxToken } from "../../_lib/store.js"
import { exchangeCodeForToken } from "../../_lib/upstox.js"

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const code = typeof req.query.code === "string" ? req.query.code : undefined
  const state = typeof req.query.state === "string" ? req.query.state : undefined

  if (!verifyOAuthState(state)) {
    res.status(403).send("This link did not come from the site's own Upstox connect flow. Not proceeding.")
    return
  }

  if (!code) {
    res.status(400).send("Upstox did not return an authorization code.")
    return
  }

  try {
    const { accessToken, expiresAt } = await exchangeCodeForToken(code)
    await setUpstoxToken(accessToken, expiresAt)
    res.status(200).setHeader("Content-Type", "text/html").send(connectedPage(expiresAt))
  } catch (err) {
    res.status(500).send(`Failed to connect Upstox: ${(err as Error).message}`)
  }
}

function connectedPage(expiresAt: number): string {
  const expiresLabel = new Date(expiresAt).toLocaleString("en-IN")
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta http-equiv="refresh" content="2;url=/app/admin/broker" />
<title>Upstox connected</title>
<style>
  body { background: #05070c; color: #eceff4; font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
  .card { text-align: center; }
  a { color: #ffb020; }
</style>
</head>
<body>
  <div class="card">
    <p>Upstox connected. Token valid until ${expiresLabel}.</p>
    <p>Redirecting back to the app… <a href="/app/admin/broker">click here</a> if it doesn't happen automatically.</p>
  </div>
</body>
</html>`
}
