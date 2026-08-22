import { computeInitialCameraView } from './studioCamera';
import type { BuildingMass } from '@/lib/studio/types';

function mass(overrides: Partial<BuildingMass> = {}): BuildingMass {
  return {
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
    ...overrides,
  };
}

describe('computeInitialCameraView', () => {
  it('deterministiktir — ayni girdi ayni sonucu verir', () => {
    const a = computeInitialCameraView(mass());
    const b = computeInitialCameraView(mass());
    expect(a).toEqual(b);
  });

  it('hedef, kutlenin dikey orta noktasidir', () => {
    const view = computeInitialCameraView(mass({ heightM: 20 }));
    expect(view.target).toEqual([0, 10, 0]);
  });

  it('daha genis bir taban icin kamera daha uzaga konumlanir', () => {
    const small = computeInitialCameraView(
      mass({ footprint: { source: 'demo', points: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }] } }),
    );
    const large = computeInitialCameraView(
      mass({ footprint: { source: 'demo', points: [{ x: 0, y: 0 }, { x: 80, y: 0 }, { x: 80, y: 60 }, { x: 0, y: 60 }] } }),
    );
    expect(large.position[0]).toBeGreaterThan(small.position[0]);
    expect(large.position[2]).toBeGreaterThan(small.position[2]);
  });

  it('daha yuksek bir kutle icin kamera daha uzaga konumlanir', () => {
    const short = computeInitialCameraView(mass({ heightM: 6 }));
    const tall = computeInitialCameraView(mass({ heightM: 60 }));
    expect(tall.position[1]).toBeGreaterThan(short.position[1]);
  });

  it('dejenere (sifir alanli/tek nokta) footprint icin sonlu, pozitif bir kamera konumu doner', () => {
    const view = computeInitialCameraView(
      mass({ footprint: { source: 'demo', points: [{ x: 5, y: 5 }] } }),
    );
    view.position.forEach((component) => {
      expect(Number.isFinite(component)).toBe(true);
      expect(component).toBeGreaterThan(0);
    });
  });

  it('kamera her zaman zeminin ustunde (pozitif Y) konumlanir', () => {
    const view = computeInitialCameraView(mass());
    expect(view.position[1]).toBeGreaterThan(0);
  });
});
