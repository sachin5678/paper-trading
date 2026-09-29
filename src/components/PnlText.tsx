import clsx from "clsx"
import { formatSigned } from "../lib/format"

export function PnlText({ value, decimals = 2, className }: { value: number; decimals?: number; className?: string }) {
  const isFlat = Math.abs(value) < 0.005
  return (
    <span
      className={clsx(
        "font-mono font-tabular",
        isFlat ? "text-[var(--color-text-dim)]" : value > 0 ? "text-[var(--color-up)]" : "text-[var(--color-down)]",
        className,
      )}
    >
      {formatSigned(value, decimals)}
    </span>
  )
}

export function PnlPercent({ value, className }: { value: number; className?: string }) {
  const isFlat = Math.abs(value) < 0.005
  return (
    <span
      className={clsx(
        "font-mono font-tabular",
        isFlat ? "text-[var(--color-text-dim)]" : value > 0 ? "text-[var(--color-up)]" : "text-[var(--color-down)]",
        className,
      )}
    >
      {value > 0 ? "+" : ""}
      {value.toFixed(2)}%
    </span>
  )
}
