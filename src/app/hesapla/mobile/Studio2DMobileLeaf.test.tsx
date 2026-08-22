/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Studio2DMobileLeaf } from './Studio2DMobileLeaf';

// Studio2DPreview/StudioLayoutControls'un kendi testleri (Faz3A Task 3/4)
// gorunum/kontrol davranisini zaten kapsiyor; bu dosya YALNIZCA mobil yaprak
// kabugunu (baslik + kapat) test eder — LandownerOfferMobileLeaf ile ayni desen.
describe('Studio2DMobileLeaf', () => {
  it('baslik ve kapat dugmesini gosterir, tiklaninca onKapat i cagirir', async () => {
    const user = userEvent.setup();
    const onKapat = jest.fn();
    render(
      <Studio2DMobileLeaf
        parcelPolygon={null}
        mass={null}
        layoutDraft={null}
        programBands={[]}
        onKapat={onKapat}
      />,
    );

    expect(screen.getByRole('heading', { name: '2D Yerleşim Tahtası' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Kapat' }));
    expect(onKapat).toHaveBeenCalledTimes(1);
  });

  it('Studio2DPreview i sahiplenilen proplarla render eder', () => {
    render(
      <Studio2DMobileLeaf
        parcelPolygon={null}
        mass={null}
        layoutDraft={null}
        programBands={[]}
        onKapat={jest.fn()}
      />,
    );
    expect(screen.getByText(/parsel geometrisi gerekiyor/i)).toBeInTheDocument();
  });

  it('mass ve layoutDraft varsa StudioLayoutControls i da render eder', () => {
    const mass = {
      footprint: {
        source: 'verified_tkgm' as const,
        areaM2: 400,
        points: [{ x: 0, y: 0 }, { x: 20, y: 0 }, { x: 20, y: 20 }, { x: 0, y: 20 }],
      },
      heightM: 12,
      floorCount: 4,
      floorHeightM: 3,
      grossConstructionAreaM2: 1200,
      warnings: [],
    };
    const layoutDraft = {
      footprint: { centerX: 0, centerY: 0, rotationDeg: 0, scale: 1, insetM: 0 },
      setback: { frontM: 0, sideM: 0, rearM: 0 },
      programBandIds: [],
    };
    render(
      <Studio2DMobileLeaf
        parcelPolygon={mass.footprint}
        mass={mass}
        layoutDraft={layoutDraft}
        programBands={[]}
        onLayoutDraftChange={jest.fn()}
        onKapat={jest.fn()}
      />,
    );
    expect(screen.getByLabelText(/kapsama/i)).toBeInTheDocument();
  });
});
