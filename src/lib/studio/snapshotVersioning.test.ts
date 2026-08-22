import {
  canonicalizeJson,
  computeSnapshotHash,
  upcastSnapshot,
  shouldCreateNewVersion,
  extractSnapshotSummary,
} from './snapshotVersioning';
import type { StudioSnapshotDraft } from './types';

describe('snapshotVersioning', () => {
  const sampleSnapshotA: StudioSnapshotDraft = {
    schemaVersion: 1,
    createdAt: '2026-08-22T20:00:00.000Z',
    massingInput: {
      parcelAreaM2: 1200,
      grossConstructionAreaM2: 3000,
      grossConstructionAreaSource: 'authoritative',
      parcelPolygon: {
        points: [{ x: 0, y: 0 }, { x: 40, y: 0 }, { x: 40, y: 30 }, { x: 0, y: 30 }],
        source: 'verified_tkgm',
        parcelIdentity: { il: 'İstanbul', ilce: 'Kadıköy', mahalle: 'Fenerbahçe', adaNo: '200', parselNo: '1' },
      },
    },
    buildingMass: null,
    layoutDraft: {
      footprint: { centerX: 20, centerY: 15, rotationDeg: 90, scale: 0.9 },
      setback: { frontM: 3, sideM: 3, rearM: 3 },
      commercialFrontage: { edgeIndex: 0, lengthM: 10 },
      programBandIds: [],
    },
    landownerOffer: {
      entitledUnitCount: 8.2,
      wholeUnitCount: 8,
      fractionalUnitBalance: 0.2,
      options: [],
      warnings: [],
    },
    valuationAssumptions: {
      currency: 'TRY',
      valuationDate: '2026-08-22',
      unitValueTl: 5000000,
      shopValueTl: 7000000,
    },
    warnings: [
      { code: 'DEMO_GEOMETRY', message: 'Demo parsel geometrisi kullanılıyor.' },
      { code: 'OFFER_NEEDS_REBALANCE', message: 'Teklifi dengelemeniz önerilir.' },
    ],
  };

  // Aynısı ama anahtarlar farklı sırada tanımlanmış
  const sampleSnapshotB: StudioSnapshotDraft = {
    warnings: [
      { code: 'DEMO_GEOMETRY', message: 'Demo parsel geometrisi kullanılıyor.' },
      { code: 'OFFER_NEEDS_REBALANCE', message: 'Teklifi dengelemeniz önerilir.' },
    ],
    schemaVersion: 1,
    valuationAssumptions: {
      valuationDate: '2026-08-22',
      shopValueTl: 7000000,
      currency: 'TRY',
      unitValueTl: 5000000,
    },
    massingInput: {
      parcelPolygon: {
        source: 'verified_tkgm',
        parcelIdentity: { adaNo: '200', il: 'İstanbul', ilce: 'Kadıköy', mahalle: 'Fenerbahçe', parselNo: '1' },
        points: [{ x: 0, y: 0 }, { x: 40, y: 0 }, { x: 40, y: 30 }, { x: 0, y: 30 }],
      },
      grossConstructionAreaSource: 'authoritative',
      grossConstructionAreaM2: 3000,
      parcelAreaM2: 1200,
    },
    landownerOffer: {
      warnings: [],
      options: [],
      fractionalUnitBalance: 0.2,
      wholeUnitCount: 8,
      entitledUnitCount: 8.2,
    },
    createdAt: '2026-08-22T20:00:00.000Z',
    layoutDraft: {
      commercialFrontage: { lengthM: 10, edgeIndex: 0 },
      setback: { rearM: 3, sideM: 3, frontM: 3 },
      footprint: { scale: 0.9, rotationDeg: 90, centerY: 15, centerX: 20 },
      programBandIds: [],
    },
    buildingMass: null,
  };

  it('canonicalizeJson farkli siradaki anahtarlari deterministik siralar', () => {
    const jsonA = canonicalizeJson(sampleSnapshotA);
    const jsonB = canonicalizeJson(sampleSnapshotB);
    expect(jsonA).toBe(jsonB);
  });

  it('computeSnapshotHash ozdes snapshotlar icin ayni hash uretir', () => {
    const hashA = computeSnapshotHash(sampleSnapshotA);
    const hashB = computeSnapshotHash(sampleSnapshotB);
    expect(hashA).toBe(hashB);
    expect(typeof hashA).toBe('string');
    expect(hashA.length).toBe(64); // SHA-256 hex
  });

  it('shouldCreateNewVersion ayni icerikte false, farkli icerikte true doner', () => {
    const hashA = computeSnapshotHash(sampleSnapshotA);
    expect(shouldCreateNewVersion(hashA, sampleSnapshotB)).toBe(false);

    const modifiedSnapshot: StudioSnapshotDraft = {
      ...sampleSnapshotA,
      layoutDraft: {
        ...sampleSnapshotA.layoutDraft!,
        footprint: {
          ...sampleSnapshotA.layoutDraft!.footprint,
          scale: 0.8,
        },
      },
    };
    expect(shouldCreateNewVersion(hashA, modifiedSnapshot)).toBe(true);
  });

  it('extractSnapshotSummary onemli metadata ve uyarilari cikarir', () => {
    const summary = extractSnapshotSummary(sampleSnapshotA);
    expect(summary.parcelSourceStatus).toBe('verified_tkgm');
    expect(summary.needsRebalance).toBe(true);
    expect(summary.warningCount).toBe(2);
    expect(summary.parcelIdentity?.ilce).toBe('Kadıköy');
    expect(summary.totalAllocatedAreaM2).toBe(0);
  });

  // REGRESYON: extractSnapshotSummary, ProgramMixItem'da olmayan bir alan
  // (`allocatedAreaM2`) okuyordu; gercek alanlar `unitCount`/`unitAreaM2`.
  // Sonuc: dolu bir programMix ile bile totalAllocatedAreaM2 HER ZAMAN 0
  // donuyordu (StudioSaveDialog'da kullaniciya "X m² / 0 m²" gosteriliyordu).
  // Ustteki test bunu kacirmisti cunku sampleSnapshotA'da hic programMix yoktu.
  it('extractSnapshotSummary dolu bir programMix ile toplam tahsis edilen alani DOGRU hesaplar', () => {
    const snapshotWithProgramMix: StudioSnapshotDraft = {
      ...sampleSnapshotA,
      programMix: [
        { id: 'a', use: 'residential', residentialType: '2+1', unitCount: 6, unitAreaM2: 85 },
        { id: 'b', use: 'commercial', unitCount: 3, unitAreaM2: 40 },
      ],
    };
    const summary = extractSnapshotSummary(snapshotWithProgramMix);
    expect(summary.totalAllocatedAreaM2).toBe(6 * 85 + 3 * 40);
  });

  it('upcastSnapshot gecersiz veya gelecekteki sema versiyonlarini reddeder', () => {
    expect(() => upcastSnapshot(null, 1)).toThrow(/Geçersiz snapshot/);
    expect(() => upcastSnapshot({ schemaVersion: 99 }, 99)).toThrow(/Desteklenmeyen şema versiyonu/);
  });

  it('upcastSnapshot v1 snapshotini eksiksiz dogrular ve dondurur', () => {
    const result = upcastSnapshot(sampleSnapshotA, 1);
    expect(result.schemaVersion).toBe(1);
    expect(result.massingInput.parcelAreaM2).toBe(1200);
    expect(result.layoutDraft?.footprint.scale).toBe(0.9);
  });
});
