// Local-only stand-in for Vercel's Serverless Functions runtime. Vite proxies
// /api/* here in dev (see vite.config.ts); in production Vercel serves the
// same files under api/ directly, with no code difference required.
import { createServer, type ServerResponse } from "node:http"
import { config } from "dotenv"
import type { VercelRequest, VercelResponse } from "@vercel/node"

config()

const PORT = Number(process.env.API_DEV_PORT ?? 3001)

type Handler = (req: VercelRequest, res: VercelResponse) => unknown

const routes: Record<string, () => Promise<{ default: Handler }>> = {
  "/api/broker/upstox/authorize": () => import("../api/broker/upstox/authorize.js"),
  "/api/broker/upstox/callback": () => import("../api/broker/upstox/callback.js"),
  "/api/market/option-chain": () => import("../api/market/option-chain.js"),
}

function withVercelHelpers(res: ServerResponse): VercelResponse {
  const enhanced = res as unknown as VercelResponse
  let statusCode = 200
  enhanced.status = (code: number) => {
    statusCode = code
    return enhanced
  }
  enhanced.json = (body: unknown) => {
    res.writeHead(statusCode, { "Content-Type": "application/json" })
    res.end(JSON.stringify(body))
    return enhanced
  }
  enhanced.send = (body: string) => {
    res.writeHead(statusCode, { "Content-Type": "text/plain; charset=utf-8" })
    res.end(body)
    return enhanced
  }
  return enhanced
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`)
  const loadHandler = routes[url.pathname]
  const enhancedRes = withVercelHelpers(res)

  if (!loadHandler) {
    enhancedRes.status(404).json({ error: "Not found" })
    return
  }

  try {
    const { default: handler } = await loadHandler()
    const query = Object.fromEntries(url.searchParams.entries())
    const vercelLikeReq = Object.assign(req, { query, cookies: {}, body: undefined }) as unknown as VercelRequest
    await handler(vercelLikeReq, enhancedRes)
  } catch (err) {
    console.error(err)
    enhancedRes.status(500).json({ error: (err as Error).message })
  }
})

server.listen(PORT, () => {
  console.log(`Local API dev server listening on http://localhost:${PORT}`)
})
