import { withSuggestedRiskLevel, RiskLevel } from './riskSuggestionHelpers';

const BASE: RiskLevel[] = [
  { id: 'default-risk-0', label: 'Risksiz', value: 0, sortOrder: 0, isDefault: true },
  { id: 'default-risk-1', label: 'Düşük', value: 5, sortOrder: 1, isDefault: false },
  { id: 'default-risk-2', label: 'Orta', value: 10, sortOrder: 2, isDefault: false },
  { id: 'default-risk-3', label: 'Yüksek', value: 15, sortOrder: 3, isDefault: false },
];

describe('withSuggestedRiskLevel', () => {
  it('onerilen yuzde zaten bir secenekse diziyi degistirmeden doner', () => {
    const result = withSuggestedRiskLevel(BASE, 10);
    expect(result).toBe(BASE);
    expect(result).toHaveLength(4);
  });

  it('onerilen yuzde yeniyse diziye eklenir', () => {
    const result = withSuggestedRiskLevel(BASE, 8);
    expect(result).toHaveLength(5);
    expect(result.find(o => o.value === 8)).toBeTruthy();
  });

  it('art arda iki farkli oneri uygulandiginda id ler birbirinden farkli olur (React key cakismasi olmamali)', () => {
    const afterFirst = withSuggestedRiskLevel(BASE, 8);
    const afterSecond = withSuggestedRiskLevel(afterFirst, 12);

    const suggested = afterSecond.filter(o => o.value === 8 || o.value === 12);
    expect(suggested).toHaveLength(2);
    const ids = suggested.map(o => o.id);
    expect(new Set(ids).size).toBe(2);
  });

  it('sonuc dizisi her zaman value a gore sirali kalir', () => {
    const result = withSuggestedRiskLevel(BASE, 8);
    const values = result.map(o => o.value);
    const sorted = [...values].sort((a, b) => a - b);
    expect(values).toEqual(sorted);
  });
});
