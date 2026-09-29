export function Sparkline({ points, width = 240, height = 56, color }: { points: number[]; width?: number; height?: number; color: string }) {
  if (points.length < 2) return null
  const min = Math.min(...points)
  const max = Math.max(...points)
  const range = max - min || 1
  const step = width / (points.length - 1)
  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${(height - ((p - min) / range) * height).toFixed(1)}`)
    .join(" ")

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img" aria-label="Equity trend, simulated">
      <path d={path} fill="none" stroke={color} strokeWidth={1.75} />
    </svg>
  )
}
