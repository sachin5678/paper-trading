import { useEffect, useState } from "react"
import { localDateString } from "./store"

// Reading the wall clock directly in a render body is an impure call React
// (and oxlint) rightly flag — this hook is the correct place for it instead,
// and it means a tab left open across midnight actually picks up the new
// day rather than freezing on whatever date it mounted with.
export function useTodayDateString(): string {
  const [today, setToday] = useState(() => localDateString(new Date()))

  useEffect(() => {
    const id = window.setInterval(() => setToday(localDateString(new Date())), 60_000)
    return () => window.clearInterval(id)
  }, [])

  return today
}
