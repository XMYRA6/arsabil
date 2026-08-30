/** Sıralı kopya üzerinde lineer enterpolasyonlu persentil. p: 0–100. */
export function percentile(values: number[], p: number): number {
  if (values.length === 0) throw new Error('percentile: empty')
  const sorted = [...values].sort((a, b) => a - b)
  if (sorted.length === 1) return sorted[0]
  const rank = (p / 100) * (sorted.length - 1)
  const low = Math.floor(rank)
  const high = Math.ceil(rank)
  if (low === high) return sorted[low]
  const frac = rank - low
  return sorted[low] + frac * (sorted[high] - sorted[low])
}

export function median(values: number[]): number {
  if (values.length === 0) throw new Error('median: empty')
  return percentile(values, 50)
}
