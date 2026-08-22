import { createStudioSnapshotDraft } from './snapshot';
import { summarizeProgramMix } from './programMix';
import { calculateLandownerEntitlement, createLandownerOfferOptions } from './landownerOffer';
import type { ProgramMixItem, StudioPolygon } from './types';

const polygon: StudioPolygon = {
  source: 'verified_tkgm',
  areaM2: 50,
  parcelIdentity: { il: 'Izmir', ilce: 'Urla', adaNo: '101', parselNo: '7' },
  points: [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
  ],
};

describe('createStudioSnapshotDraft', () => {
  it('creates a versioned JSON-serializable Studio snapshot with source metadata', () => {
    const snapshot = createStudioSnapshotDraft({
      sourceId: 'report-1',
      createdAt: '2026-08-16T12:00:00.000Z',
      massingInput: {
        parcelAreaM2: 50,
        grossConstructionAreaM2: 300,
        grossConstructionAreaSource: 'authoritative',
        assumedFloorCount: 3,
        parcelPolygon: polygon,
      },
    });

    expect(snapshot).toMatchObject({
      schemaVersion: 1,
      sourceId: 'report-1',
      parcelGeometrySource: 'verified_tkgm',
      parcelIdentity: { il: 'Izmir', ilce: 'Urla', adaNo: '101', parselNo: '7' },
      constructionAreaSource: 'authoritative',
      buildingMass: {
        floorCount: 3,
        heightM: 9.600000000000001,
      },
      warnings: [],
    });
    expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot);
  });

  it('keeps warnings in the snapshot when massing cannot be derived', () => {
    const snapshot = createStudioSnapshotDraft({
      createdAt: '2026-08-16T12:00:00.000Z',
      massingInput: {
        parcelAreaM2: null,
        grossConstructionAreaM2: null,
        grossConstructionAreaSource: null,
      },
    });

    expect(snapshot.buildingMass).toBeNull();
    expect(snapshot.parcelGeometrySource).toBeNull();
    expect(snapshot.constructionAreaSource).toBeNull();
    expect(snapshot.warnings.map((warning) => warning.code)).toEqual([
      'INVALID_AREA',
      'MISSING_GROSS_CONSTRUCTION_AREA',
      'MISSING_GEOMETRY',
    ]);
  });

  it('adds a non-verified visual warning for demo geometry snapshots', () => {
    const snapshot = createStudioSnapshotDraft({
      createdAt: '2026-08-16T12:00:00.000Z',
      massingInput: {
        parcelAreaM2: 50,
        grossConstructionAreaM2: 300,
        grossConstructionAreaSource: 'estimated_apartment_area',
        assumedFloorCount: 3,
        parcelPolygon: { ...polygon, source: 'demo', parcelIdentity: undefined },
      },
    });

    expect(snapshot.parcelGeometrySource).toBe('demo');
    expect(snapshot.warnings).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'DEMO_GEOMETRY' }),
      expect.objectContaining({ code: 'NON_VERIFIED_VISUAL' }),
    ]));
    expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot);
  });

  // Faz 2 Task 4: programMix ve landownerOffer snapshot'a eklenir, JSON
  // roundtrip'i bozmaz, alt uyarilar ust seviye warnings'e katilir (mevcut
  // buildingMass/NON_VERIFIED_VISUAL deseniyle ayni ruh).
  it('programMix ve landownerOffer i snapshot a ekler, roundtrip guvenlidir', () => {
    const items: ProgramMixItem[] = [
      { id: 'a', use: 'residential', residentialType: '2+1', unitCount: 20, unitAreaM2: 500 },
    ];
    const programSummary = summarizeProgramMix(items, 300); // kasitli asim -> uyari
    const entitlement = calculateLandownerEntitlement(0.4, 23);
    const landownerOffer = createLandownerOfferOptions({ ...entitlement, unitValueTl: null }); // kasitli eksik varsayim -> uyari

    const snapshot = createStudioSnapshotDraft({
      createdAt: '2026-08-16T12:00:00.000Z',
      massingInput: {
        parcelAreaM2: 50,
        grossConstructionAreaM2: 300,
        grossConstructionAreaSource: 'authoritative',
        assumedFloorCount: 3,
        parcelPolygon: polygon,
      },
      programMix: items,
      programSummary,
      landownerOffer,
    });

    expect(snapshot.programMix).toEqual(items);
    expect(snapshot.programSummary).toEqual(programSummary);
    expect(snapshot.landownerOffer).toEqual(landownerOffer);
    expect(snapshot.warnings).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'PROGRAM_AREA_EXCEEDS_AVAILABLE' }),
      expect.objectContaining({ code: 'MISSING_UNIT_VALUE_BASIS' }),
    ]));
    expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot);
  });

  // Faz 2B Task 5: valuationAssumptions GENISLETME (landownerOffer alani
  // Faz 2'den beri zaten var, DEGISMEZ). Para birimi/tarih eksikse parasal
  // degerler snapshot'ta gecersiz (null) kabul edilir — sessizce degil,
  // INVALID_VALUATION_METADATA uyarisiyla.
  it('gecerli valuationAssumptions i snapshot a ekler, roundtrip guvenlidir', () => {
    const valuationAssumptions = {
      currency: 'TRY',
      valuationDate: '2026-08-22',
      unitValueTl: 2_000_000,
    };
    const snapshot = createStudioSnapshotDraft({
      createdAt: '2026-08-16T12:00:00.000Z',
      massingInput: {
        parcelAreaM2: 50,
        grossConstructionAreaM2: 300,
        grossConstructionAreaSource: 'authoritative',
        assumedFloorCount: 3,
        parcelPolygon: polygon,
      },
      valuationAssumptions,
    });

    expect(snapshot.valuationAssumptions).toEqual(valuationAssumptions);
    expect(snapshot.warnings.some((w) => w.code === 'INVALID_VALUATION_METADATA')).toBe(false);
    expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot);
  });

  it('para birimi veya tarih eksikse parasal degerleri gecersiz sayar ve uyarir', () => {
    const snapshot = createStudioSnapshotDraft({
      createdAt: '2026-08-16T12:00:00.000Z',
      massingInput: {
        parcelAreaM2: 50,
        grossConstructionAreaM2: 300,
        grossConstructionAreaSource: 'authoritative',
        assumedFloorCount: 3,
        parcelPolygon: polygon,
      },
      valuationAssumptions: {
        currency: '',
        valuationDate: '2026-08-22',
        unitValueTl: 2_000_000,
        unitValuePerM2Tl: 25_000,
        shopValueTl: 500_000,
      },
    });

    expect(snapshot.valuationAssumptions).toMatchObject({
      unitValueTl: null,
      unitValuePerM2Tl: null,
      shopValueTl: null,
    });
    expect(snapshot.warnings.some((w) => w.code === 'INVALID_VALUATION_METADATA')).toBe(true);
  });

  it('valuationAssumptions verilmezse snapshot eskisi gibi (undefined) kalir', () => {
    const snapshot = createStudioSnapshotDraft({
      createdAt: '2026-08-16T12:00:00.000Z',
      massingInput: {
        parcelAreaM2: 50,
        grossConstructionAreaM2: 300,
        grossConstructionAreaSource: 'authoritative',
        assumedFloorCount: 3,
        parcelPolygon: polygon,
      },
    });
    expect(snapshot.valuationAssumptions).toBeUndefined();
  });

  // Faz 3A Task 5: layoutDraft GENISLETME — landownerOffer/valuationAssumptions
  // ile AYNI ekleme deseni (mevcut alanlar DEGISMEZ, yeni alan opsiyonel).
  it('layoutDraft i snapshot a ekler, roundtrip guvenlidir', () => {
    const layoutDraft = {
      footprint: { centerX: 0, centerY: 0, rotationDeg: 0, scale: 0.8, insetM: 0 },
      setback: { frontM: 2, sideM: 1, rearM: 3 },
      programBandIds: ['band-1'],
    };
    const snapshot = createStudioSnapshotDraft({
      createdAt: '2026-08-16T12:00:00.000Z',
      massingInput: {
        parcelAreaM2: 50,
        grossConstructionAreaM2: 300,
        grossConstructionAreaSource: 'authoritative',
        assumedFloorCount: 3,
        parcelPolygon: polygon,
      },
      layoutDraft,
    });

    expect(snapshot.layoutDraft).toEqual(layoutDraft);
    expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot);
  });

  it('layoutDraft verilmezse snapshot eskisi gibi (undefined) kalir', () => {
    const snapshot = createStudioSnapshotDraft({
      createdAt: '2026-08-16T12:00:00.000Z',
      massingInput: {
        parcelAreaM2: 50,
        grossConstructionAreaM2: 300,
        grossConstructionAreaSource: 'authoritative',
        assumedFloorCount: 3,
        parcelPolygon: polygon,
      },
    });
    expect(snapshot.layoutDraft).toBeUndefined();
  });

  it('programMix/landownerOffer verilmezse snapshot eskisi gibi (undefined) kalir', () => {
    const snapshot = createStudioSnapshotDraft({
      createdAt: '2026-08-16T12:00:00.000Z',
      massingInput: {
        parcelAreaM2: 50,
        grossConstructionAreaM2: 300,
        grossConstructionAreaSource: 'authoritative',
        assumedFloorCount: 3,
        parcelPolygon: polygon,
      },
    });

    expect(snapshot.programMix).toBeUndefined();
    expect(snapshot.programSummary).toBeUndefined();
    expect(snapshot.landownerOffer).toBeUndefined();
  });
});
