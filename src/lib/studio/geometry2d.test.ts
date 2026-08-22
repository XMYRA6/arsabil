import {
  computeCentroid,
  computePolygonBounds,
  computeViewBox,
  isPointInPolygon,
  isPolygonWithin,
  deriveFootprintPolygon,
  classifyFootprintAgainstParcel,
} from './geometry2d';
import type { FootprintDraft, StudioPoint } from './types';

// Koordinat birimi METRE'dir (Studio'nun geri kalaniyla ayni, bkz.
// `StudioPoint`/`StudioPolygon`). Kayan nokta karsilastirmalari icin
// tolerans `toBeCloseTo` varsayilani (1e-2 metre, ~1cm) kullanilir — bu
// gorsel bir on-izleme, CAD-hassasiyetinde bir olcum degildir (Exit
// Criteria: "Studio CAD araci gibi davranmaz").

const square: StudioPoint[] = [
  { x: 0, y: 0 },
  { x: 10, y: 0 },
  { x: 10, y: 10 },
  { x: 0, y: 10 },
];

const identityDraft: FootprintDraft = { centerX: 0, centerY: 0, rotationDeg: 0, scale: 1, insetM: 0 };

describe('computeCentroid', () => {
  it('bir karenin merkezini dogru hesaplar (kaynak: kose ortalamasi)', () => {
    expect(computeCentroid(square)).toEqual({ x: 5, y: 5 });
  });

  it('bos poligon icin orijini doner', () => {
    expect(computeCentroid([])).toEqual({ x: 0, y: 0 });
  });
});

describe('computePolygonBounds', () => {
  it('bir karenin sinir kutusunu dogru hesaplar', () => {
    expect(computePolygonBounds(square)).toEqual({ minX: 0, minY: 0, maxX: 10, maxY: 10, width: 10, height: 10 });
  });
});

describe('computeViewBox', () => {
  it('varsayilan %10 dolguyla sinir kutusunu genisletir', () => {
    expect(computeViewBox(square)).toEqual({ x: -1, y: -1, width: 12, height: 12 });
  });
});

describe('isPointInPolygon / isPolygonWithin', () => {
  it('poligon icindeki bir noktayi ic olarak tanir', () => {
    expect(isPointInPolygon({ x: 5, y: 5 }, square)).toBe(true);
  });

  it('poligon disindaki bir noktayi dis olarak tanir', () => {
    expect(isPointInPolygon({ x: 20, y: 20 }, square)).toBe(false);
  });

  it('kucuk bir ic poligonu buyuk bir dis poligon icinde basitce (kose bazli) dogrular', () => {
    const inner: StudioPoint[] = [
      { x: 2, y: 2 }, { x: 8, y: 2 }, { x: 8, y: 8 }, { x: 2, y: 8 },
    ];
    expect(isPolygonWithin(inner, square)).toBe(true);
  });

  it('sinirlarin disina tasan bir ic poligonu reddeder', () => {
    const inner: StudioPoint[] = [
      { x: 2, y: 2 }, { x: 15, y: 2 }, { x: 15, y: 8 }, { x: 2, y: 8 },
    ];
    expect(isPolygonWithin(inner, square)).toBe(false);
  });

  it('bir poligonun KENDI koseleri, kendi poligonuna karsi HER ZAMAN icerde sayilir (regresyon: kose-dejenerasyonu)', () => {
    // Duzensiz, eksen-hizasiz dortgen (gercek demo parsel poligonuyla ayni
    // sekil) — standart ray-casting'in kose testinde dejenere oldugu
    // durumu yeniden uretir (bkz. isPointOnPolygonBoundary yorumu).
    const irregular: StudioPoint[] = [
      { x: -16, y: -10 },
      { x: 14, y: -12 },
      { x: 18, y: 8 },
      { x: -12, y: 12 },
    ];
    irregular.forEach((point) => {
      expect(isPointInPolygon(point, irregular)).toBe(true);
    });
    expect(isPolygonWithin(irregular, irregular)).toBe(true);
  });
});

describe('deriveFootprintPolygon', () => {
  it('kimlik taslakla (scale=1, donus=0, merkez=0) tabanla AYNI poligonu uretir (Task 1 karari)', () => {
    const result = deriveFootprintPolygon(square, identityDraft);
    result.forEach((point, i) => {
      expect(point.x).toBeCloseTo(square[i].x);
      expect(point.y).toBeCloseTo(square[i].y);
    });
  });

  it('olcek 0.5 merkeze dogru kuculten deterministik bir poligon uretir', () => {
    const result = deriveFootprintPolygon(square, { ...identityDraft, scale: 0.5 });
    // Merkez (5,5) sabit kalir, koseler merkeze yarim mesafede olur.
    expect(result[0].x).toBeCloseTo(2.5);
    expect(result[0].y).toBeCloseTo(2.5);
    expect(result[2].x).toBeCloseTo(7.5);
    expect(result[2].y).toBeCloseTo(7.5);
  });

  it('merkez ofseti (centerX/centerY) poligonu oteler', () => {
    const result = deriveFootprintPolygon(square, { ...identityDraft, centerX: 3, centerY: -2 });
    expect(result[0].x).toBeCloseTo(3);
    expect(result[0].y).toBeCloseTo(-2);
  });

  it('90 derece donus koseleri deterministik olarak cevirir', () => {
    const result = deriveFootprintPolygon(square, { ...identityDraft, rotationDeg: 90 });
    // Merkez (5,5) sabit; (0,0) -> merkeze gore (-5,-5) -> 90 derece donunce (5,-5) -> +merkez (10,0).
    expect(result[0].x).toBeCloseTo(10);
    expect(result[0].y).toBeCloseTo(0);
  });

  it('inset pozitif verilince poligonu kendi merkezine dogru kucultur', () => {
    const withoutInset = deriveFootprintPolygon(square, identityDraft);
    const withInset = deriveFootprintPolygon(square, { ...identityDraft, insetM: 1 });
    const centroid = computeCentroid(withoutInset);
    const distWithout = Math.hypot(withoutInset[0].x - centroid.x, withoutInset[0].y - centroid.y);
    const distWith = Math.hypot(withInset[0].x - centroid.x, withInset[0].y - centroid.y);
    expect(distWith).toBeLessThan(distWithout);
  });

  it('bos taban poligonu icin bos dizi doner (cokme yerine sessizce)', () => {
    expect(deriveFootprintPolygon([], identityDraft)).toEqual([]);
  });
});

describe('classifyFootprintAgainstParcel', () => {
  const parcel: StudioPoint[] = [
    { x: 0, y: 0 }, { x: 20, y: 0 }, { x: 20, y: 20 }, { x: 0, y: 20 },
  ];

  it('parsel icinde kalan ve butceyi asmayan footprint icin uyari uretmez', () => {
    const footprint = deriveFootprintPolygon(square, { ...identityDraft, centerX: 5, centerY: 5 });
    expect(classifyFootprintAgainstParcel(footprint, parcel, 200)).toEqual([]);
  });

  it('parsel disina tasan footprint icin LAYOUT_FOOTPRINT_OUTSIDE_PARCEL doner', () => {
    const footprint = deriveFootprintPolygon(square, { ...identityDraft, centerX: 25, centerY: 25 });
    const warnings = classifyFootprintAgainstParcel(footprint, parcel, 200);
    expect(warnings.some((w) => w.code === 'LAYOUT_FOOTPRINT_OUTSIDE_PARCEL')).toBe(true);
  });

  it('alan butcesini asan footprint icin LAYOUT_FOOTPRINT_EXCEEDS_AREA_BUDGET doner (parsel icinde kalsa bile)', () => {
    const footprint = deriveFootprintPolygon(square, { ...identityDraft, centerX: 5, centerY: 5 });
    const warnings = classifyFootprintAgainstParcel(footprint, parcel, 50); // 100 m^2 footprint > 50 m^2 butce
    expect(warnings.some((w) => w.code === 'LAYOUT_FOOTPRINT_EXCEEDS_AREA_BUDGET')).toBe(true);
  });

  it('butce verilmezse alan kontrolu atlanir', () => {
    const footprint = deriveFootprintPolygon(square, { ...identityDraft, centerX: 5, centerY: 5 });
    expect(classifyFootprintAgainstParcel(footprint, parcel)).toEqual([]);
  });

  it('regresyon: kimlik taslak (scale=1) duzensiz bir parselde SAHTE disina-tasma uyarisi uretmez', () => {
    // Playwright ile yakalandi: degistirilmemis varsayilan durumda bile
    // "parsel sinirinin disina tasiyor" gorunuyordu — kok neden
    // isPointInPolygon'daki kose-dejenerasyonuydu (bkz. o fonksiyonun testi).
    const irregularParcel: StudioPoint[] = [
      { x: -16, y: -10 },
      { x: 14, y: -12 },
      { x: 18, y: 8 },
      { x: -12, y: 12 },
    ];
    const footprint = deriveFootprintPolygon(irregularParcel, identityDraft);
    expect(classifyFootprintAgainstParcel(footprint, irregularParcel, 1000)).toEqual([]);
  });
});
