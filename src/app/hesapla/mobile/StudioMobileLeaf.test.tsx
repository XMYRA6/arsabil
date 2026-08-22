/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StudioMobileLeaf } from './StudioMobileLeaf';
import type { BuildingMass } from '@/lib/studio/types';

const mass: BuildingMass = {
  footprint: {
    source: 'demo',
    points: [
      { x: 0, y: 0 },
      { x: 20, y: 0 },
      { x: 20, y: 10 },
      { x: 0, y: 10 },
    ],
  },
  heightM: 12.8,
  floorCount: 4,
  floorHeightM: 3.2,
  grossConstructionAreaM2: 2800,
  warnings: [],
};

// StudioPreview'in kendi testleri (Faz1B) 3D canvas'i zaten kapsiyor; bu
// dosya YALNIZCA mobil yaprak kabugunun (baslik + kapat) davranisini test
// eder — StudioPreview'i tekrar test etmez (bkz. FiyatAciklamasi/AnalizSekmesi
// ile ayni desen: leaf'ler kendi bilesenlerini kopyalamaz, sarmalar).
describe('StudioMobileLeaf', () => {
  it('baslik ve kapat dugmesini gosterir, tiklaninca onKapat i cagirir', async () => {
    const user = userEvent.setup();
    const onKapat = jest.fn();
    render(
      <StudioMobileLeaf
        mass={null}
        warnings={[]}
        geometrySource="Parsel sınırı bilinmiyor"
        geometryStatus="missing"
        constructionAreaSource="İnşaat alanı kaynağı bilinmiyor"
        constructionAreaEstimated
        onKapat={onKapat}
      />,
    );

    expect(screen.getByRole('heading', { name: '3D Önizleme' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Kapat' }));
    expect(onKapat).toHaveBeenCalledTimes(1);
  });

  it('StudioPreview i mass ile render eder (ozet kart erisilebilir)', () => {
    render(
      <StudioMobileLeaf
        mass={mass}
        warnings={[]}
        geometrySource="Demo parsel sınırı"
        geometryStatus="demo"
        constructionAreaSource="Tahmini inşaat alanı"
        constructionAreaEstimated
        onKapat={jest.fn()}
      />,
    );

    expect(screen.getByText('Demo geometri')).toBeInTheDocument();
    expect(screen.getByText('2.800 m²')).toBeInTheDocument();
  });
});
