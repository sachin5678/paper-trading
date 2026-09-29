import { useEffect, useState } from "react"
import { randomWalk } from "./marketData"

export function useLiveTicks<T extends { ltp: number }>(seed: T[], intervalMs = 1800): T[] {
  const [items, setItems] = useState(seed)

  useEffect(() => {
    setItems(seed)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed.map((s) => (s as unknown as { symbol: string }).symbol).join(",")])

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const tick = () => setItems((prev) => prev.map((item) => ({ ...item, ltp: randomWalk(item.ltp) })))
    const id = window.setInterval(tick, prefersReducedMotion ? intervalMs * 4 : intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])

  return items
}
