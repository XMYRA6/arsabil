import {
  parseStudioScenarioRecord,
  parseStudioScenarioVersionRecord,
  validateCreateScenarioPayload,
  validateCreateVersionPayload,
} from './persistenceTypes';
import type { StudioSnapshotDraft } from './types';

describe('persistenceTypes', () => {
  const mockSnapshot: StudioSnapshotDraft = {
    schemaVersion: 1,
    createdAt: '2026-08-22T20:00:00.000Z',
    massingInput: {
      parcelAreaM2: 1000,
      grossConstructionAreaM2: 2000,
      grossConstructionAreaSource: 'authoritative',
      parcelPolygon: {
        points: [{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 50, y: 20 }, { x: 0, y: 20 }],
        source: 'verified_tkgm',
        parcelIdentity: { il: 'İstanbul', ilce: 'Kadıköy', mahalle: 'Caddebostan', adaNo: '101', parselNo: '5' },
      },
    },
    buildingMass: null,
    warnings: [],
  };

  it('validateCreateScenarioPayload gecersiz verileri yakalar ve reddeder', () => {
    // Isim eksik
    const invalid1 = validateCreateScenarioPayload({
      name: '',
      snapshot: mockSnapshot,
    });
    expect(invalid1.isValid).toBe(false);
    expect(invalid1.errors).toContain('Senaryo adı boş olamaz.');

    // Snapshot eksik
    const invalid2 = validateCreateScenarioPayload({
      name: 'Geçerli İsim',
      snapshot: null as any,
    });
    expect(invalid2.isValid).toBe(false);
    expect(invalid2.errors).toContain('Geçerli bir Studio snapshot gereklidir.');

    // Gecerli payload
    const valid = validateCreateScenarioPayload({
      name: 'Örnek Senaryo',
      description: 'Açıklama',
      snapshot: mockSnapshot,
      summaryNotes: 'İlk versiyon',
    });
    expect(valid.isValid).toBe(true);
    expect(valid.errors).toHaveLength(0);
  });

  it('validateCreateVersionPayload beklenen surum numarasini denetler', () => {
    const invalid = validateCreateVersionPayload({
      scenarioId: 'sc-1',
      expectedVersionNumber: 0, // <= 0 invalid
      snapshot: mockSnapshot,
    });
    expect(invalid.isValid).toBe(false);
    expect(invalid.errors).toContain('Geçerli bir beklenen versiyon numarası (>= 1) gereklidir.');

    const valid = validateCreateVersionPayload({
      scenarioId: 'sc-1',
      expectedVersionNumber: 1,
      snapshot: mockSnapshot,
    });
    expect(valid.isValid).toBe(true);
  });

  it('parseStudioScenarioRecord veritabani kaydini guvenle DTO formatina cevirir', () => {
    const rawDbRow = {
      id: 'sc-1',
      userId: 'user-1',
      name: 'Proje Senaryosu',
      description: 'Detay',
      parcelIdentity: JSON.stringify({ il: 'İstanbul', ilce: 'Kadıköy' }),
      baseInputHash: 'hash-123',
      parcelSourceStatus: 'verified_tkgm',
      currentVersionNumber: 2,
      isArchived: false,
      createdAt: new Date('2026-08-22T10:00:00.000Z'),
      updatedAt: new Date('2026-08-22T12:00:00.000Z'),
    };

    const parsed = parseStudioScenarioRecord(rawDbRow);
    expect(parsed.id).toBe('sc-1');
    expect(parsed.name).toBe('Proje Senaryosu');
    expect(parsed.parcelIdentity).toEqual({ il: 'İstanbul', ilce: 'Kadıköy' });
    expect(parsed.currentVersionNumber).toBe(2);
    expect(parsed.isArchived).toBe(false);
    expect(parsed.createdAt).toBe('2026-08-22T10:00:00.000Z');
  });

  it('parseStudioScenarioVersionRecord snapshot JSON stringini guvenle parse eder', () => {
    const rawVersionRow = {
      id: 'ver-1',
      scenarioId: 'sc-1',
      versionNumber: 1,
      snapshotJson: JSON.stringify(mockSnapshot),
      snapshotHash: 'hash-abc',
      schemaVersion: 1,
      summaryNotes: 'İlk kayıt',
      needsRebalance: false,
      warningCount: 0,
      createdAt: new Date('2026-08-22T10:00:00.000Z'),
    };

    const parsed = parseStudioScenarioVersionRecord(rawVersionRow);
    expect(parsed.id).toBe('ver-1');
    expect(parsed.versionNumber).toBe(1);
    expect(parsed.snapshot.schemaVersion).toBe(1);
    expect(parsed.snapshot.massingInput.parcelAreaM2).toBe(1000);
  });
});
