/** Diri fay mesafesi metni. RiskSuggestionCard'ın eski yerel fonksiyonundan çıkarıldı. */
export function formatFaultDistance(m: number | null): string {
  if (m === null) return '25 km’den uzak'
  return m >= 1000 ? `${(m / 1000).toFixed(1).replace('.', ',')} km` : `${m} m`
}
