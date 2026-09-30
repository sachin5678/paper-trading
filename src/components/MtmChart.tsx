import { useMemo, useRef, useState } from "react"
import { formatSigned } from "../lib/format"
import type { IntradayPoint } from "../lib/types"

const VB_WIDTH = 1000
const VB_HEIGHT = 320
const MARGIN = { top: 16, right: 12, bottom: 28, left: 64 }

interface MtmChartProps {
  points: IntradayPoint[]
  startEquity: number
  height?: number
}

// A full-size intraday P&L chart — gridlines, a filled area, a live crosshair
// with a tooltip, and time/value axis labels. Built to replace the small
// Dashboard sparkline (which only ever showed a bare trend line, unreadable
// once the session was more than a few minutes old) on its own dedicated page.
export function MtmChart({ points, startEquity, height = 380 }: MtmChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  const series = useMemo(() => points.map((p) => ({ t: p.t, value: p.equity - startEquity })), [points, startEquity])

  const plotWidth = VB_WIDTH - MARGIN.left - MARGIN.right
  const plotHeight = VB_HEIGHT - MARGIN.top - MARGIN.bottom

  const minT = series[0]?.t ?? 0
  const maxT = series[series.length - 1]?.t ?? 1
  const tRange = maxT - minT || 1

  const rawMin = Math.min(...series.map((p) => p.value), 0)
  const rawMax = Math.max(...series.map((p) => p.value), 0)
  const pad = Math.max((rawMax - rawMin) * 0.12, 10)
  const min = rawMin - pad
  const max = rawMax + pad
  const range = max - min || 1

  function x(t: number): number {
    return MARGIN.left + ((t - minT) / tRange) * plotWidth
  }
  function y(value: number): number {
    return MARGIN.top + plotHeight - ((value - min) / range) * plotHeight
  }

  const isUp = (series[series.length - 1]?.value ?? 0) >= 0
  const color = isUp ? "var(--color-up)" : "var(--color-down)"

  const linePath = series.map((p, i) => `${i === 0 ? "M" : "L"}${x(p.t).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ")
  const areaPath =
    series.length > 0
      ? `${linePath} L${x(maxT).toFixed(1)},${y(0).toFixed(1)} L${x(minT).toFixed(1)},${y(0).toFixed(1)} Z`
      : ""

  const gridValues = [min, min + range * 0.25, min + range * 0.5, min + range * 0.75, max]
  const zeroInRange = min <= 0 && max >= 0

  const timeLabelCount = 5
  const timeLabels = Array.from({ length: timeLabelCount }, (_, i) => {
    const t = minT + (tRange * i) / (timeLabelCount - 1)
    return { t, x: x(t) }
  })

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    if (series.length === 0 || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const fracX = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1)
    const targetT = minT + fracX * tRange
    let nearest = 0
    let nearestDist = Infinity
    for (let i = 0; i < series.length; i++) {
      const dist = Math.abs(series[i].t - targetT)
      if (dist < nearestDist) {
        nearestDist = dist
        nearest = i
      }
    }
    setHoverIndex(nearest)
  }

  const hovered = hoverIndex !== null ? series[hoverIndex] : null
  const hoveredPct = hovered ? ((x(hovered.t) - MARGIN.left) / plotWidth) * 100 : 0

  if (series.length < 2) {
    return (
      <div className="flex items-center justify-center text-xs text-[var(--color-text-faint)]" style={{ height }}>
        Check back in a bit — building today's chart as prices tick.
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="relative"
      style={{ height }}
      onMouseMove={handleMove}
      onMouseLeave={() => setHoverIndex(null)}
    >
      <svg viewBox={`0 0 ${VB_WIDTH} ${VB_HEIGHT}`} preserveAspectRatio="none" width="100%" height="100%">
        <defs>
          <linearGradient id="mtmFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.32" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {gridValues.map((v) => (
          <line
            key={v}
            x1={MARGIN.left}
            x2={VB_WIDTH - MARGIN.right}
            y1={y(v)}
            y2={y(v)}
            stroke="var(--color-border)"
            strokeWidth="1"
          />
        ))}
        {gridValues.map((v) => (
          <text
            key={`label-${v}`}
            x={MARGIN.left - 8}
            y={y(v)}
            textAnchor="end"
            dominantBaseline="middle"
            fontSize="11"
            fontFamily="var(--font-mono, monospace)"
            fill="var(--color-text-faint)"
          >
            {formatSigned(v, 0)}
          </text>
        ))}

        {zeroInRange && (
          <line
            x1={MARGIN.left}
            x2={VB_WIDTH - MARGIN.right}
            y1={y(0)}
            y2={y(0)}
            stroke="var(--color-text-faint)"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
        )}

        <path d={areaPath} fill="url(#mtmFill)" />
        <path d={linePath} fill="none" stroke={color} strokeWidth="2" />

        {timeLabels.map(({ t, x: tx }) => (
          <text
            key={t}
            x={Math.min(Math.max(tx, MARGIN.left + 20), VB_WIDTH - MARGIN.right - 20)}
            y={VB_HEIGHT - 8}
            textAnchor="middle"
            fontSize="11"
            fontFamily="var(--font-mono, monospace)"
            fill="var(--color-text-faint)"
          >
            {new Date(t).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
          </text>
        ))}

        {hovered && (
          <>
            <line
              x1={x(hovered.t)}
              x2={x(hovered.t)}
              y1={MARGIN.top}
              y2={VB_HEIGHT - MARGIN.bottom}
              stroke="var(--color-text-faint)"
              strokeWidth="1"
            />
            <circle cx={x(hovered.t)} cy={y(hovered.value)} r="4" fill={color} stroke="var(--color-bg-raised)" strokeWidth="1.5" />
          </>
        )}
      </svg>

      {hovered && (
        <div
          className="pointer-events-none absolute top-2 -translate-x-1/2 whitespace-nowrap border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-2.5 py-1.5 text-xs shadow-lg"
          style={{ left: `${Math.min(Math.max(hoveredPct, 10), 90)}%` }}
        >
          <p className="font-mono text-[10px] text-[var(--color-text-faint)]">
            {new Date(hovered.t).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </p>
          <p
            className="font-mono font-tabular font-semibold"
            style={{ color: hovered.value >= 0 ? "var(--color-up)" : "var(--color-down)" }}
          >
            {formatSigned(hovered.value, 0)}
          </p>
        </div>
      )}
    </div>
  )
}
