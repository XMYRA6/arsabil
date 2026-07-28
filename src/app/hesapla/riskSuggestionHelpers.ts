export interface RiskLevel {
  id: string;
  label: string;
  value: number;
  sortOrder: number;
  isDefault: boolean;
}

/**
 * TBDY onerisini ayrik risk izgarasina ekler. Izgara `key={opt.id}` ile
 * render edildigi icin id, ayni yuzdenin tekrar tekrar uygulanmasinda
 * cakismasin diye onerilen degerden (`percent`) turetilir; farkli iki
 * oneri art arda uygulandiginda birbirinden ayirt edilebilir kalir.
 *
 * Onerilen yuzde zaten bir secenek olarak varsa dizi degismeden doner
 * (duplike secenek eklenmez). Sonuc her zaman `value`'ya gore sirali.
 */
export function withSuggestedRiskLevel(levels: RiskLevel[], percent: number): RiskLevel[] {
  if (levels.some(o => o.value === percent)) return levels;
  return [
    ...levels,
    {
      id: `tbdy-suggested-${percent}`,
      label: 'TBDY önerisi',
      value: percent,
      sortOrder: levels.length,
      isDefault: false,
    },
  ].sort((a, b) => a.value - b.value);
}
