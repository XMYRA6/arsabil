import { generate2dSvgString, svgToDataUri } from './proposalAssets';
import type { StudioPolygon, StudioLayoutDraft } from './types';

describe('proposalAssets', () => {
  const mockParcel: StudioPolygon = {
    points: [
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 50, y: 30 },
      { x: 0, y: 30 },
    ],
    source: 'verified_tkgm',
  };

  const mockFootprint: StudioPolygon = {
    points: [
      { x: 10, y: 5 },
      { x: 40, y: 5 },
      { x: 40, y: 25 },
      { x: 10, y: 25 },
    ],
    areaM2: 600,
    source: 'user_drawn',
  };

  const mockLayout: StudioLayoutDraft = {
    footprint: { centerX: 25, centerY: 15, rotationDeg: 0, scale: 1 },
    setback: { frontM: 5, sideM: 3, rearM: 3 },
    commercialFrontage: { edgeIndex: 0, lengthM: 30 },
    programBandIds: [],
  };

  it('gecerli parsel ve footprint verisiyle duzgun SVG uretir', () => {
    const svg = generate2dSvgString({
      parcelPolygon: mockParcel,
      footprintPolygon: mockFootprint,
      layoutDraft: mockLayout,
    });

    expect(svg).toContain('<svg');
    expect(svg).toContain('viewBox="0 0 600 400"');
    expect(svg).toContain('fill="#e2e8f0"'); // Parsel dolgusu
    expect(svg).toContain('stroke="#0284c7"'); // Footprint çizgisi
    expect(svg).toContain('stroke="#f59e0b"'); // Ticaret cephesi
    expect(svg).toContain('</svg>');
  });

  it('bos poligon durumunda fallback mesaji iceren SVG dondurur', () => {
    const svg = generate2dSvgString({
      parcelPolygon: null,
      footprintPolygon: null,
    });

    expect(svg).toContain('Geometri Verisi Bulunamadı');
  });

  it('svgToDataUri base64 data URI formatinda dondurur', () => {
    const svg = '<svg><rect/></svg>';
    const uri = svgToDataUri(svg);

    expect(uri.startsWith('data:image/svg+xml;base64,')).toBe(true);
  });
});
