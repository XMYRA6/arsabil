/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { StudioSaveDialog } from './StudioSaveDialog';
import type { StudioSnapshotDraft } from '@/lib/studio/types';

describe('StudioSaveDialog', () => {
  const mockSnapshot: StudioSnapshotDraft = {
    schemaVersion: 1,
    createdAt: '2026-08-22T20:00:00.000Z',
    massingInput: {
      parcelAreaM2: 1000,
      grossConstructionAreaM2: 2500,
      grossConstructionAreaSource: 'authoritative',
      parcelPolygon: {
        points: [{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 50, y: 20 }, { x: 0, y: 20 }],
        source: 'verified_tkgm',
        parcelIdentity: { il: 'İstanbul', ilce: 'Kadıköy', mahalle: 'Caddebostan' },
      },
    },
    buildingMass: null,
    warnings: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it('isOpen false iken hicbir sey render etmez', () => {
    const { container } = render(
      <StudioSaveDialog
        isOpen={false}
        onClose={jest.fn()}
        currentSnapshot={mockSnapshot}
        scenarioName="Test Senaryo"
        onSaveSuccess={jest.fn()}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('isOpen true iken modal ve ozet kartini dogru gosterir', () => {
    render(
      <StudioSaveDialog
        isOpen={true}
        onClose={jest.fn()}
        currentSnapshot={mockSnapshot}
        scenarioName="Varsayılan Senaryo"
        onSaveSuccess={jest.fn()}
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Senaryoyu Buluta Kaydet')).toBeInTheDocument();
    expect(screen.getByText(/İstanbul Kadıköy/)).toBeInTheDocument();
    expect(screen.getByText('TKGM Doğrulanmış')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Varsayılan Senaryo')).toBeInTheDocument();
  });

  // REGRESYON: ozet karti "Brüt İnşaat / Tahsis" alaninda dolu bir
  // programMix'le bile HER ZAMAN "0 m²" gosteriyordu (snapshotVersioning.ts'te
  // ProgramMixItem'da olmayan `allocatedAreaM2` alani okunuyordu — gercek
  // alanlar unitCount/unitAreaM2). Duzeltme sonrasi gercek toplami gostermeli.
  it('doldurulmus programMix ile tahsis edilen alani DOGRU gosterir, sabit 0 gostermez', () => {
    const snapshotWithProgramMix: StudioSnapshotDraft = {
      ...mockSnapshot,
      programMix: [
        { id: 'a', use: 'residential', residentialType: '2+1', unitCount: 6, unitAreaM2: 85 },
        { id: 'b', use: 'commercial', unitCount: 3, unitAreaM2: 40 },
      ],
    };
    render(
      <StudioSaveDialog
        isOpen={true}
        onClose={jest.fn()}
        currentSnapshot={snapshotWithProgramMix}
        scenarioName="Test Senaryo"
        onSaveSuccess={jest.fn()}
      />
    );

    // 6*85 + 3*40 = 630
    expect(screen.getByText(/630 m²/)).toBeInTheDocument();
  });

  it('kaydet butonuna basildiginda API cagrisi yapar ve basarida callback calistirir', async () => {
    const onSaveSuccess = jest.fn();
    const onClose = jest.fn();

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        scenario: { id: 'sc-123', name: 'Yeni Senaryo' },
        version: { id: 'ver-1', versionNumber: 1 },
      }),
    });

    render(
      <StudioSaveDialog
        isOpen={true}
        onClose={onClose}
        currentSnapshot={mockSnapshot}
        scenarioName="Yeni Senaryo"
        onSaveSuccess={onSaveSuccess}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/studio/scenarios', expect.objectContaining({
        method: 'POST',
      }));
      expect(onSaveSuccess).toHaveBeenCalledWith(
        { id: 'sc-123', name: 'Yeni Senaryo' },
        { id: 'ver-1', versionNumber: 1 }
      );
      expect(onClose).toHaveBeenCalled();
    });
  });
});
