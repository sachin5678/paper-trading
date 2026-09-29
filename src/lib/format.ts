export function formatInr(value: number, options: { decimals?: number } = {}): string {
  const { decimals = 2 } = options
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function formatNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function formatSigned(value: number, decimals = 2): string {
  const sign = value > 0 ? "+" : ""
  return `${sign}${formatNumber(value, decimals)}`
}

export function formatCompactInr(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`
  if (abs >= 100000) return `₹${(value / 100000).toFixed(2)} L`
  if (abs >= 1000) return `₹${(value / 1000).toFixed(1)} K`
  return formatInr(value, { decimals: 0 })
}
