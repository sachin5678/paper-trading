import type { ReactNode } from "react"
import clsx from "clsx"

interface PanelProps {
  title?: string
  eyebrow?: string
  action?: ReactNode
  children: ReactNode
  className?: string
  padded?: boolean
}

// The recurring "instrument panel" chrome: hairline border, corner ticks
// like an oscilloscope readout. This is the terminal's structural signature —
// every data panel in the app uses it so the UI reads as one instrument.
export function Panel({ title, eyebrow, action, children, className, padded = true }: PanelProps) {
  return (
    <section
      className={clsx(
        "relative border border-[var(--color-border)] bg-[var(--color-bg-raised)]",
        className,
      )}
    >
      <CornerTicks />
      {(title || action) && (
        <header className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
          <div>
            {eyebrow && (
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-faint)]">
                {eyebrow}
              </p>
            )}
            {title && <h3 className="text-sm font-medium text-[var(--color-text)]">{title}</h3>}
          </div>
          {action}
        </header>
      )}
      <div className={padded ? "p-4" : ""}>{children}</div>
    </section>
  )
}

function CornerTicks() {
  return (
    <>
      <span className="pointer-events-none absolute left-0 top-0 h-2 w-2 border-l border-t border-[var(--color-border-strong)]" />
      <span className="pointer-events-none absolute right-0 top-0 h-2 w-2 border-r border-t border-[var(--color-border-strong)]" />
      <span className="pointer-events-none absolute bottom-0 left-0 h-2 w-2 border-b border-l border-[var(--color-border-strong)]" />
      <span className="pointer-events-none absolute bottom-0 right-0 h-2 w-2 border-b border-r border-[var(--color-border-strong)]" />
    </>
  )
}
