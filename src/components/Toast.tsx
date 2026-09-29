import { useEffect } from "react"
import { CheckCircle2 } from "lucide-react"

export function Toast({ message, onDismiss }: { message: string | null; onDismiss: () => void }) {
  useEffect(() => {
    if (!message) return
    const id = window.setTimeout(onDismiss, 4000)
    return () => window.clearTimeout(id)
  }, [message, onDismiss])

  if (!message) return null

  return (
    <div
      role="status"
      className="fixed bottom-20 left-1/2 z-50 flex max-w-sm -translate-x-1/2 items-start gap-2 border border-[var(--color-up)]/40 bg-[var(--color-up-dim)] px-4 py-3 text-sm text-[var(--color-text)] shadow-xl md:bottom-4"
    >
      <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-[var(--color-up)]" aria-hidden="true" />
      <span>{message}</span>
    </div>
  )
}
