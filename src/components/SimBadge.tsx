import clsx from "clsx"

// Deliberately the only violet in the system. It never appears on market
// data — only on chrome that says "this is a simulation," so the two
// vocabularies (real-feeling data vs. practice-mode signage) stay legible
// at a glance, even to a first-time user.
export function SimBadge({ className }: { className?: string }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 border border-[var(--color-paper)]/40 bg-[var(--color-paper-dim)] px-2 py-0.5",
        "font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--color-paper)]",
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-paper)]" aria-hidden="true" />
      Simulated
    </span>
  )
}
