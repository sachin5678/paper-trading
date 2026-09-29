import clsx from "clsx"

// Companion to SimBadge, for surfaces where the data source can genuinely be
// live. Live status uses amber (our brand/status color, never used for market
// data) rather than green, so it can never be mistaken for a price-up signal.
// Simulated keeps the same violet used everywhere else for "not real."
export function FeedBadge({ source, className }: { source: "live" | "simulated"; className?: string }) {
  const isLive = source === "live"
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 border px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.14em]",
        isLive
          ? "border-[var(--color-amber)]/40 bg-[var(--color-amber-soft)] text-[var(--color-amber)]"
          : "border-[var(--color-paper)]/40 bg-[var(--color-paper-dim)] text-[var(--color-paper)]",
        className,
      )}
    >
      <span
        className={clsx("h-1.5 w-1.5 rounded-full", isLive ? "bg-[var(--color-amber)]" : "bg-[var(--color-paper)]")}
        aria-hidden="true"
      />
      {isLive ? "Live" : "Simulated"}
    </span>
  )
}
