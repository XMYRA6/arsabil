export function ymKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

export function formatPctChange(from: number, to: number): string {
  const pct = (to - from) / from
  if (Math.abs(pct) < 0.005) {
    return 'değişim yok'
  }
  const pctPercent = (Math.abs(pct) * 100).toFixed(1).replace('.', ',')
  const direction = pct > 0 ? 'artış' : 'düşüş'
  return `%${pctPercent} ${direction}`
}
