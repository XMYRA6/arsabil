/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { StudioFallback } from './StudioFallback';
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

describe('StudioFallback', () => {
  it('WebGL desteklenmiyorken nedeni acikca belirtir', () => {
    render(<StudioFallback mass={mass} reason="unsupported" />);
    expect(screen.getByText(/webgl desteklenmiyor/i)).toBeInTheDocument();
  });

  it('canvas hatasi durumunda farkli, ayirt edilebilir bir mesaj gosterir', () => {
    render(<StudioFallback mass={mass} reason="error" />);
    expect(screen.getByText(/3d önizleme yüklenemedi/i)).toBeInTheDocument();
    expect(screen.queryByText(/webgl desteklenmiyor/i)).not.toBeInTheDocument();
  });

  it('canvas olmadan tum temel metrikleri sunar', () => {
    render(<StudioFallback mass={mass} reason="error" />);

    expect(screen.getByText('4')).toBeInTheDocument(); // kat sayisi
    expect(screen.getByText(/13\s*m/)).toBeInTheDocument(); // yukseklik (StudioPreview.summaryGrid ile ayni yuvarlama)
    expect(screen.getByText(/2\.800\s*m²/)).toBeInTheDocument(); // brut insaat
  });

  it('footprint semasini erisilebilir bir gorsel olarak sunar, canvas render etmez', () => {
    const { container } = render(<StudioFallback mass={mass} reason="error" />);

    expect(screen.getByRole('img', { name: /parsel footprint şeması/i })).toBeInTheDocument();
    expect(container.querySelector('canvas')).not.toBeInTheDocument();
  });
});
