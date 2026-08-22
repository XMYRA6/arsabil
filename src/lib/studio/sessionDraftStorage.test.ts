/**
 * @jest-environment jsdom
 */

import {
  saveSessionDrafts,
  loadSessionDrafts,
  clearSessionDrafts,
  computeBaseSnapshotHash,
  SESSION_STORAGE_KEY,
} from './sessionDraftStorage';
import { createDefaultScenarioDraft } from './scenarioDraft';
import type { StudioScenarioDraft } from './types';

describe('sessionDraftStorage', () => {
  const mockScenario: StudioScenarioDraft = createDefaultScenarioDraft({
    id: 'sc-1',
    name: 'Taslak 1',
    baseSnapshotRef: { parcelAreaM2: 1000, grossConstructionAreaM2: 2000 },
    programMix: [],
    layout: null,
  });

  const baseHash = computeBaseSnapshotHash({
    parcelAreaM2: 1000,
    grossConstructionAreaM2: 2000,
    parcelGeometrySource: 'verified_tkgm',
  });

  let mockStorage: Record<string, string> = {};

  beforeEach(() => {
    mockStorage = {};
    Object.defineProperty(window, 'sessionStorage', {
      value: {
        getItem: jest.fn((key: string) => mockStorage[key] || null),
        setItem: jest.fn((key: string, val: string) => {
          mockStorage[key] = val;
        }),
        removeItem: jest.fn((key: string) => {
          delete mockStorage[key];
        }),
        clear: jest.fn(() => {
          mockStorage = {};
        }),
      },
      writable: true,
    });
  });

  it('senaryo taslaklarini session storage icine basariyla kaydeder ve yukler', () => {
    saveSessionDrafts({
      scenarios: [mockScenario],
      activeScenarioId: 'sc-1',
      baseHash,
    });

    const loaded = loadSessionDrafts({ currentBaseHash: baseHash });
    expect(loaded).not.toBeNull();
    expect(loaded?.scenarios).toHaveLength(1);
    expect(loaded?.scenarios[0].id).toBe('sc-1');
    expect(loaded?.activeScenarioId).toBe('sc-1');
    expect(loaded?.needsRevalidation).toBe(false);
  });

  it('kaynak veri hash i degistiginde needsRevalidation true doner', () => {
    saveSessionDrafts({
      scenarios: [mockScenario],
      activeScenarioId: 'sc-1',
      baseHash,
    });

    const differentBaseHash = 'hash-changed-parcel-123';
    const loaded = loadSessionDrafts({ currentBaseHash: differentBaseHash });

    expect(loaded).not.toBeNull();
    expect(loaded?.needsRevalidation).toBe(true);
  });

  it('TTL suresi doldugunda taslaklar yuklenmez (null doner)', () => {
    const pastTime = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(); // 48h ago

    saveSessionDrafts({
      scenarios: [mockScenario],
      activeScenarioId: 'sc-1',
      baseHash,
      nowIso: pastTime,
    });

    const loaded = loadSessionDrafts({ currentBaseHash: baseHash });
    expect(loaded).toBeNull();
  });

  it('clearSessionDrafts kaydi temizler', () => {
    saveSessionDrafts({
      scenarios: [mockScenario],
      activeScenarioId: 'sc-1',
      baseHash,
    });

    clearSessionDrafts();
    const loaded = loadSessionDrafts({ currentBaseHash: baseHash });
    expect(loaded).toBeNull();
  });
});
