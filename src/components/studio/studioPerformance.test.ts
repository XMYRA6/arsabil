import { MAX_FOOTPRINT_POINTS, checkFootprintComplexity } from './studioPerformance';
import type { StudioPoint } from '@/lib/studio/types';

function makePoints(count: number): StudioPoint[] {
  return Array.from({ length: count }, (_, index) => ({
    x: Math.cos((index / count) * Math.PI * 2) * 20,
    y: Math.sin((index / count) * Math.PI * 2) * 20,
  }));
}

describe('checkFootprintComplexity', () => {
  it('sinir altindaki nokta sayisi icin uyari uretmez', () => {
    const result = checkFootprintComplexity(makePoints(6));
    expect(result.exceedsLimit).toBe(false);
    expect(result.pointCount).toBe(6);
    expect(result.warningMessage).toBeNull();
  });

  it('sinirin tam ustundeki nokta sayisi icin sadelestirme uyarisi uretir', () => {
    const result = checkFootprintComplexity(makePoints(MAX_FOOTPRINT_POINTS + 1));
    expect(result.exceedsLimit).toBe(true);
    expect(result.warningMessage).toMatch(/sadeleştir/i);
  });

  it('sinira tam esit nokta sayisinda uyari uretmez (sinir DAHIL kabul edilir)', () => {
    const result = checkFootprintComplexity(makePoints(MAX_FOOTPRINT_POINTS));
    expect(result.exceedsLimit).toBe(false);
  });
});
