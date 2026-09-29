import type { VercelRequest, VercelResponse } from "@vercel/node"
import { verifyOAuthState } from "../../_lib/crypto"
import { setUpstoxToken } from "../../_lib/store"
import { exchangeCodeForToken } from "../../_lib/upstox"

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
    res
      .status(200)
      .send(`Upstox connected. Token valid until ${new Date(expiresAt).toLocaleString("en-IN")}. You can close this tab.`)
  } catch (err) {
    res.status(500).send(`Failed to connect Upstox: ${(err as Error).message}`)
  }
}
