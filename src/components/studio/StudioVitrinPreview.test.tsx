/** @jest-environment jsdom */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StudioVitrinPreview } from './StudioVitrinPreview';
import type { StudioSnapshotDraft } from '@/lib/studio/types';
import type { VitrinCaptureHandle } from './StudioVitrinCapture';

let mockCaptureHandle: VitrinCaptureHandle | null = {
  captureFrame: () => ({
    colorImageDataUrl: 'data:image/png;base64,color',
    depthImageDataUrl: 'data:image/png;base64,depth',
    cameraPosition: [10, 10, 10],
  }),
};

const sceneMock = jest.fn((_props?: unknown) => <div data-testid="vitrin-scene" />);
jest.mock('./StudioVitrinScene', () => ({
  StudioVitrinScene: (props: { onCaptureReady?: (handle: VitrinCaptureHandle) => void }) => {
    // Callback-prop deseni: forwardRef/useImperativeHandle DEĞİL — next/dynamic
    // ({ssr:false}) bu kod tabanındaki Next/React sürüm kombinasyonunda ref'i
    // çözümlenmiş forwardRef bileşenine iletmiyor (ampirik olarak doğrulandı,
    // bkz. StudioVitrinCapture.tsx'teki not), bu yüzden capture handle bir
    // callback prop ile yukarı taşınıyor — düz prop'lar next/dynamic üzerinden
    // sorunsuz geçtiği için burada gerçek next/dynamic'i mock'lamaya gerek yok.
    React.useEffect(() => {
      if (mockCaptureHandle) {
        props.onCaptureReady?.(mockCaptureHandle);
      }
    }, [props.onCaptureReady]);
    return sceneMock(props);
  },
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

  it('isPro=false ise render butonu gösterilmez', async () => {
    const user = userEvent.setup();
    render(<StudioVitrinPreview snapshot={snapshot} scenarioId="s1" versionNumber={1} isPro={false} />);
    await user.click(screen.getByRole('button', { name: /göster|goster/i }));
    await screen.findByTestId('vitrin-scene');
    expect(screen.queryByRole('button', { name: /Fotogerçekçi/i })).not.toBeInTheDocument();
  });

  it('isPro=true, sahne hazır: buton tıklanınca fetch çağrılır ve sonuç görseli gösterilir', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ imageUrl: 'https://cdn.fal.ai/out.png', cached: false }),
    }) as unknown as typeof fetch;

    const user = userEvent.setup();
    render(<StudioVitrinPreview snapshot={snapshot} scenarioId="s1" versionNumber={1} isPro={true} />);
    await user.click(screen.getByRole('button', { name: /göster|goster/i }));
    await screen.findByTestId('vitrin-scene');

    await user.click(screen.getByRole('button', { name: /Fotogerçekçi/i }));

    await waitFor(() => {
      expect(screen.getByAltText(/Fotogerçekçi bina görseli/i)).toHaveAttribute('src', 'https://cdn.fal.ai/out.png');
    });
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/studio/scenarios/s1/versions/1/render',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('sağlayıcı hata döndürürse hata mesajı gösterir', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ message: 'Render üretilemedi, lütfen tekrar deneyin.' }),
    }) as unknown as typeof fetch;

    const user = userEvent.setup();
    render(<StudioVitrinPreview snapshot={snapshot} scenarioId="s1" versionNumber={1} isPro={true} />);
    await user.click(screen.getByRole('button', { name: /göster|goster/i }));
    await screen.findByTestId('vitrin-scene');
    await user.click(screen.getByRole('button', { name: /Fotogerçekçi/i }));

    expect(await screen.findByText('Render üretilemedi, lütfen tekrar deneyin.')).toBeInTheDocument();
  });

  it('capture ref hazır değilse fetch ÇAĞRILMADAN hata gösterir', async () => {
    mockCaptureHandle = null;
    global.fetch = jest.fn();

    const user = userEvent.setup();
    render(<StudioVitrinPreview snapshot={snapshot} scenarioId="s1" versionNumber={1} isPro={true} />);
    await user.click(screen.getByRole('button', { name: /göster|goster/i }));
    await screen.findByTestId('vitrin-scene');
    await user.click(screen.getByRole('button', { name: /Fotogerçekçi/i }));

    expect(await screen.findByText(/sahne henüz hazır değil/i)).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();

    mockCaptureHandle = {
      captureFrame: () => ({
        colorImageDataUrl: 'data:image/png;base64,color',
        depthImageDataUrl: 'data:image/png;base64,depth',
        cameraPosition: [10, 10, 10],
      }),
    };
  });
});
