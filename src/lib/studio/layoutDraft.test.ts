import { createDefaultLayoutDraft, validateLayoutDraft } from './layoutDraft';
import type { ProgramBand, StudioPolygon } from './types';

const parcel: StudioPolygon = {
  source: 'verified_tkgm',
  areaM2: 500,
  points: [
    { x: 0, y: 0 },
    { x: 20, y: 0 },
    { x: 20, y: 25 },
    { x: 0, y: 25 },
  ],
};

const bands: ProgramBand[] = [
  { id: 'band-1', use: 'residential', floorRange: { startFloor: 1, endFloor: 3 }, areaM2: 900, colorSlotIndex: 0 },
  { id: 'band-2', use: 'commercial', floorRange: { startFloor: 0, endFloor: 0 }, areaM2: 200, colorSlotIndex: 1 },
];

describe('createDefaultLayoutDraft', () => {
  it('kimlik (scale=1, offset=0) bir taslak uretir, verilen program bantlarini referansla baglar', () => {
    const draft = createDefaultLayoutDraft(bands);
    expect(draft).toEqual({
      footprint: { centerX: 0, centerY: 0, rotationDeg: 0, scale: 1, insetM: 0 },
      setback: { frontM: 0, sideM: 0, rearM: 0 },
      programBandIds: ['band-1', 'band-2'],
    });
    expect(JSON.parse(JSON.stringify(draft))).toEqual(draft);
  });

  it('program bandi verilmezse bos referans listesiyle taslak uretir', () => {
    const draft = createDefaultLayoutDraft([]);
    expect(draft.programBandIds).toEqual([]);
  });
});

describe('validateLayoutDraft', () => {
  it('gecerli parselde, makul olcekte ve bilinen bant referanslariyla uyari uretmez', () => {
    const draft = createDefaultLayoutDraft(bands);
    expect(validateLayoutDraft(draft, parcel, bands)).toEqual([]);
  });

  it('parsel geometrisi yoksa MISSING_GEOMETRY doner, diger kontrolleri atlar', () => {
    const draft = createDefaultLayoutDraft(bands);
    const warnings = validateLayoutDraft(draft, null, bands);
    expect(warnings).toEqual([
      { code: 'MISSING_GEOMETRY', message: expect.any(String) },
    ]);
  });

  it('olcek sifir veya negatifse LAYOUT_FOOTPRINT_TOO_SMALL doner', () => {
    const draft = createDefaultLayoutDraft(bands);
    const warnings = validateLayoutDraft({ ...draft, footprint: { ...draft.footprint, scale: 0 } }, parcel, bands);
    expect(warnings.some((w) => w.code === 'LAYOUT_FOOTPRINT_TOO_SMALL')).toBe(true);
  });

  it('olcek cok kucukse (esik altinda ama pozitif) LAYOUT_FOOTPRINT_TOO_SMALL doner', () => {
    const draft = createDefaultLayoutDraft(bands);
    const warnings = validateLayoutDraft({ ...draft, footprint: { ...draft.footprint, scale: 0.02 } }, parcel, bands);
    expect(warnings.some((w) => w.code === 'LAYOUT_FOOTPRINT_TOO_SMALL')).toBe(true);
  });

  it('olcek 1i asip parsel alan butcesini asarsa LAYOUT_FOOTPRINT_OUTSIDE_PARCEL doner', () => {
    const draft = createDefaultLayoutDraft(bands);
    const warnings = validateLayoutDraft({ ...draft, footprint: { ...draft.footprint, scale: 1.5 } }, parcel, bands);
    expect(warnings.some((w) => w.code === 'LAYOUT_FOOTPRINT_OUTSIDE_PARCEL')).toBe(true);
  });

  it('bilinmeyen bir program bandi referansi LAYOUT_REFERENCES_UNKNOWN_PROGRAM_BAND uretir, sessizce yutulmaz', () => {
    const draft = createDefaultLayoutDraft(bands);
    const warnings = validateLayoutDraft(
      { ...draft, programBandIds: [...draft.programBandIds, 'band-ghost'] },
      parcel,
      bands,
    );
    expect(warnings.some((w) => w.code === 'LAYOUT_REFERENCES_UNKNOWN_PROGRAM_BAND')).toBe(true);
  });

  it('birden fazla sorun varsa hepsini birlikte doner (sessizce ilkinde durmaz)', () => {
    const draft = createDefaultLayoutDraft(bands);
    const warnings = validateLayoutDraft(
      { ...draft, footprint: { ...draft.footprint, scale: 0 }, programBandIds: ['band-ghost'] },
      parcel,
      bands,
    );
    expect(warnings.map((w) => w.code)).toEqual(
      expect.arrayContaining(['LAYOUT_FOOTPRINT_TOO_SMALL', 'LAYOUT_REFERENCES_UNKNOWN_PROGRAM_BAND']),
    );
  });
});
