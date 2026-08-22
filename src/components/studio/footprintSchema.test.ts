import { footprintToSvgPoints } from './footprintSchema';

describe('footprintToSvgPoints', () => {
  it('bir dortgen footprint icin 4 nokta uretir, 0-100 viewBox icine sigar', () => {
    const points = footprintToSvgPoints([
      { x: 0, y: 0 },
      { x: 20, y: 0 },
      { x: 20, y: 10 },
      { x: 0, y: 10 },
    ]);
    const pairs = points.trim().split(' ').map((pair) => pair.split(',').map(Number));

    expect(pairs).toHaveLength(4);
    pairs.forEach(([x, y]) => {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(100);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(100);
    });
  });

  it('bos noktalar icin bos dize doner, firlatmaz', () => {
    expect(footprintToSvgPoints([])).toBe('');
  });

  it('sifir genislik/derinlikli (dejenere) footprint icin firlatmaz', () => {
    expect(() => footprintToSvgPoints([{ x: 5, y: 5 }, { x: 5, y: 5 }])).not.toThrow();
  });
});
