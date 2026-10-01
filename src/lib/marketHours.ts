// NSE/BSE cash & F&O hours: Monday-Friday, 9:15am-3:30pm IST. Computed in IST
// regardless of the visitor's own timezone, since simulated quotes need to
// stop moving exactly when the real exchange would be shut — a fake tick on
// a Saturday afternoon or at 11pm looks like a bug, not "just simulated."
export function isMarketOpen(date: Date = new Date()): boolean {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date)

  const get = (type: string) => parts.find((p) => p.type === type)?.value
  const weekday = get("weekday")
  if (weekday === "Sat" || weekday === "Sun") return false

  // Intl can report hour "24" for midnight depending on environment.
  const hour = Number(get("hour")) % 24
  const minute = Number(get("minute"))
  const minutesSinceMidnight = hour * 60 + minute

  return minutesSinceMidnight >= 9 * 60 + 15 && minutesSinceMidnight <= 15 * 60 + 30
}
