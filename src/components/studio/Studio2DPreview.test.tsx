/** @jest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react';
import { Studio2DPreview } from './Studio2DPreview';
import type { BuildingMass, ProgramBand, StudioLayoutDraft, StudioPolygon } from '@/lib/studio/types';

const parcelPolygon: StudioPolygon = {
  source: 'verified_tkgm',
  areaM2: 400,
  points: [
    { x: 0, y: 0 },
    { x: 20, y: 0 },
    { x: 20, y: 20 },
    { x: 0, y: 20 },
  ],
};

const mass: BuildingMass = {
  footprint: parcelPolygon,
  heightM: 12,
  floorCount: 4,
  floorHeightM: 3,
  grossConstructionAreaM2: 1200,
  warnings: [],
};

const identityLayoutDraft: StudioLayoutDraft = {
  footprint: { centerX: 0, centerY: 0, rotationDeg: 0, scale: 0.5, insetM: 0 },
  setback: { frontM: 1, sideM: 1, rearM: 1 },
  programBandIds: ['band-1'],
};

const bands: ProgramBand[] = [
  { id: 'band-1', use: 'residential', floorRange: { startFloor: 1, endFloor: 3 }, areaM2: 900, colorSlotIndex: 0 },
  { id: 'band-2', use: 'commercial', floorRange: { startFloor: 0, endFloor: 0 }, areaM2: 200, colorSlotIndex: 1 },
];

describe('Studio2DPreview', () => {
  it('gecerli geometri varsa SVG icinde parsel VE footprint poligonlarini gosterir', () => {
    render(
      <Studio2DPreview parcelPolygon={parcelPolygon} mass={mass} layoutDraft={identityLayoutDraft} programBands={bands} />,
    );
    expect(screen.getByRole('img', { name: /2d yerleşim/i })).toBeInTheDocument();
    expect(screen.getByTestId('layout-parcel-polygon')).toBeInTheDocument();
    expect(screen.getByTestId('layout-footprint-polygon')).toBeInTheDocument();
  });

  it('sadece programBandIds icinde referans verilen bantlari legend olarak gosterir, digerlerini degil', () => {
    render(
      <Studio2DPreview parcelPolygon={parcelPolygon} mass={mass} layoutDraft={identityLayoutDraft} programBands={bands} />,
    );
    expect(screen.getByText('Konut')).toBeInTheDocument();
    expect(screen.queryByText('Ticari (Dükkan)')).not.toBeInTheDocument();
  });

  it('ticari cephe verilmisse cephe isaretini gosterir, verilmemisse gostermez', () => {
    const { rerender } = render(
      <Studio2DPreview parcelPolygon={parcelPolygon} mass={mass} layoutDraft={identityLayoutDraft} programBands={bands} />,
    );
    expect(screen.queryByTestId('layout-commercial-frontage')).not.toBeInTheDocument();

    rerender(
      <Studio2DPreview
        parcelPolygon={parcelPolygon}
        mass={mass}
        layoutDraft={{ ...identityLayoutDraft, commercialFrontage: { edgeIndex: 0, lengthM: 5 } }}
        programBands={bands}
      />,
    );
    expect(screen.getByTestId('layout-commercial-frontage')).toBeInTheDocument();
  });

  it('footprint parsel disina tasarsa uyari listesinde gosterir', () => {
    render(
      <Studio2DPreview
        parcelPolygon={parcelPolygon}
        mass={mass}
        layoutDraft={{ ...identityLayoutDraft, footprint: { ...identityLayoutDraft.footprint, centerX: 50, centerY: 50 } }}
        programBands={bands}
      />,
    );
    expect(screen.getByText(/parsel sınırının dışına taşıyor/i)).toBeInTheDocument();
  });

  it('bilinmeyen program bandi referansi uyari listesinde gorunur', () => {
    render(
      <Studio2DPreview
        parcelPolygon={parcelPolygon}
        mass={mass}
        layoutDraft={{ ...identityLayoutDraft, programBandIds: ['band-ghost'] }}
        programBands={bands}
      />,
    );
    expect(screen.getByText(/artık var olmayan bir program bandına/i)).toBeInTheDocument();
  });

  it('gecerli girdide uyari listesi bos olur', () => {
    render(
      <Studio2DPreview parcelPolygon={parcelPolygon} mass={mass} layoutDraft={identityLayoutDraft} programBands={bands} />,
    );
    expect(screen.queryByRole('list', { name: /uyarı/i })).not.toBeInTheDocument();
  });

  it('parsel geometrisi yoksa SVG yerine sayisal ozet ve parsel ekle cagrisi gosterir', () => {
    const onParcelEkleClick = jest.fn();
    render(
      <Studio2DPreview
        parcelPolygon={null}
        mass={null}
        layoutDraft={null}
        programBands={[]}
        onParcelEkleClick={onParcelEkleClick}
      />,
    );
    expect(screen.queryByRole('img', { name: /2d yerleşim/i })).not.toBeInTheDocument();
    const cta = screen.getByRole('button', { name: /parsel ekle/i });
    fireEvent.click(cta);
    expect(onParcelEkleClick).toHaveBeenCalledTimes(1);
  });

  it('mass verilmisse geometri yokken bile bilinen sayisal alani gosterir', () => {
    render(
      <Studio2DPreview parcelPolygon={null} mass={mass} layoutDraft={null} programBands={[]} />,
    );
    expect(screen.getByText(/1\.200/)).toBeInTheDocument();
  });
});
