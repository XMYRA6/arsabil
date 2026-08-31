export function formatTl(n: number): string {
  return Math.round(n).toLocaleString('tr-TR')
}

export function formatTlShort(n: number): string {
  if (n >= 1_000_000) {
    const s = (n / 1_000_000).toFixed(1)
    return (s.endsWith('.0') ? s.slice(0, -2) : s.replace('.', ',')) + 'M'
  }
  if (n >= 10_000) return Math.round(n / 1000) + ' B'
  return formatTl(n)
}
