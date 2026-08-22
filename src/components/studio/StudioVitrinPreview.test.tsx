/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StudioVitrinPreview } from './StudioVitrinPreview';
import type { StudioSnapshotDraft } from '@/lib/studio/types';

const sceneMock = jest.fn((_props?: unknown) => <div data-testid="vitrin-scene" />);
jest.mock('./StudioVitrinScene', () => ({
  StudioVitrinScene: (props: unknown) => sceneMock(props),
}));

const isWebGLAvailableMock = jest.fn(() => true);
jest.mock('./webglSupport', () => ({
  isWebGLAvailable: () => isWebGLAvailableMock(),
}));

const snapshot: StudioSnapshotDraft = {
  schemaVersion: 1,
  createdAt: '2026-08-23T10:00:00.000Z',
  massingInput: {
    parcelAreaM2: 500,
    grossConstructionAreaM2: 1200,
    grossConstructionAreaSource: 'authoritative',
    parcelPolygon: {
      points: [{ x: 0, y: 0 }, { x: 20, y: 0 }, { x: 20, y: 25 }, { x: 0, y: 25 }],
      source: 'verified_tkgm',
    },
  },
  buildingMass: {
    footprint: { points: [{ x: 0, y: 0 }, { x: 20, y: 0 }, { x: 20, y: 25 }, { x: 0, y: 25 }], source: 'verified_tkgm' },
    heightM: 12,
    floorCount: 4,
    floorHeightM: 3,
    grossConstructionAreaM2: 1200,
    warnings: [],
  },
  warnings: [],
};

describe('StudioVitrinPreview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    isWebGLAvailableMock.mockReturnValue(true);
  });

  it('snapshot yoksa bos-durum gosterir, sahneyi hic mount etmez', () => {
    render(<StudioVitrinPreview snapshot={null} />);
    expect(screen.queryByTestId('vitrin-scene')).not.toBeInTheDocument();
    expect(screen.getByText(/veri bekleniyor|veri yok/i)).toBeInTheDocument();
  });

  it('kullanici acmadan sahne mount edilmez (varsayilan kapali, Faz 1B deseni)', () => {
    render(<StudioVitrinPreview snapshot={snapshot} />);
    expect(screen.queryByTestId('vitrin-scene')).not.toBeInTheDocument();
  });

  it('kullanici "goster" e tiklayinca sahne mount edilir', async () => {
    const user = userEvent.setup();
    render(<StudioVitrinPreview snapshot={snapshot} />);
    await user.click(screen.getByRole('button', { name: /göster|goster/i }));
    expect(await screen.findByTestId('vitrin-scene')).toBeInTheDocument();
  });

  it('sahne acikken baglayici olmadigini belirten bir not gosterir (on teklif dili)', async () => {
    const user = userEvent.setup();
    render(<StudioVitrinPreview snapshot={snapshot} />);
    await user.click(screen.getByRole('button', { name: /göster|goster/i }));
    await screen.findByTestId('vitrin-scene');
    expect(screen.getByText(/ön fizibilite|taahhüt değildir/i)).toBeInTheDocument();
  });

  it('WebGL desteklenmiyorsa sahne yerine metin ozet gosterir', async () => {
    isWebGLAvailableMock.mockReturnValue(false);
    const user = userEvent.setup();
    render(<StudioVitrinPreview snapshot={snapshot} />);
    await user.click(screen.getByRole('button', { name: /göster|goster/i }));
    expect(screen.queryByTestId('vitrin-scene')).not.toBeInTheDocument();
    expect(await screen.findByText('3D Sahne Desteklenmiyor')).toBeInTheDocument();
  });
});
