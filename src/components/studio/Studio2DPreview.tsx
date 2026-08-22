'use client';

import styles from './Studio2DPreview.module.css';
import { formatStudioNumber } from './studioFormat';
import { PROGRAM_USE_COLORS } from './studioVisualTokens';
import { PROGRAM_USE_LABELS } from './programLabels';
import { validateLayoutDraft } from '@/lib/studio/layoutDraft';
import { computeViewBox, deriveFootprintPolygon, classifyFootprintAgainstParcel } from '@/lib/studio/geometry2d';
import type { BuildingMass, ProgramBand, StudioLayoutDraft, StudioPoint, StudioPolygon, StudioWarning } from '@/lib/studio/types';

export type Studio2DPreviewProps = {
  parcelPolygon: StudioPolygon | null;
  mass: BuildingMass | null;
  layoutDraft: StudioLayoutDraft | null;
  programBands: ProgramBand[];
  onParcelEkleClick?: () => void;
};

function worldToSvg(point: StudioPoint, viewBoxY: number, viewBoxHeight: number): StudioPoint {
  // SVG Y asagi artar, dunya Y'si yukari artar (bkz. footprintSchema.ts'teki
  // ayni not) — viewBox'in dikey merkezine gore aynala.
  return { x: point.x, y: 2 * viewBoxY + viewBoxHeight - point.y };
}

function toSvgPointsAttr(points: StudioPoint[], viewBoxY: number, viewBoxHeight: number): string {
  return points
    .map((point) => worldToSvg(point, viewBoxY, viewBoxHeight))
    .map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`)
    .join(' ');
}

function dedupeWarnings(warnings: StudioWarning[]): StudioWarning[] {
  const seen = new Set<string>();
  return warnings.filter((warning) => {
    if (seen.has(warning.code)) return false;
    seen.add(warning.code);
    return true;
  });
}

/**
 * Faz 3A Task 3 — READ-ONLY 2D teklif tahtasi. Bu bilesen HICBIR hesap
 * mantigi ICAT ETMEZ: `deriveFootprintPolygon`/`classifyFootprintAgainstParcel`/
 * `validateLayoutDraft` (Task 1/2) cagirir, yalnizca gosterir. Kontroller
 * (surukleme, sayisal girdi) Task 4'te AYRI bir bilesende (`StudioLayoutControls`)
 * gelir — bu ikisi arasindaki ayrim "parsel referanstir, footprint oneridir,
 * program renktir, uyari ayrik bilgi katmanidir" hiyerarsisini yansitir.
 */
export function Studio2DPreview({ parcelPolygon, mass, layoutDraft, programBands, onParcelEkleClick }: Studio2DPreviewProps) {
  if (!parcelPolygon || !mass || !layoutDraft) {
    return (
      <div className={styles.bosDurum}>
        <p className={styles.bosDurumBaslik}>2D yerleşim tahtası için parsel geometrisi gerekiyor.</p>
        {mass && (
          <p className={styles.bosDurumSayi}>
            Bilinen brüt inşaat alanı: {formatStudioNumber(mass.grossConstructionAreaM2)} m²
          </p>
        )}
        {onParcelEkleClick && (
          <button type="button" className={styles.parselEkleBtn} onClick={onParcelEkleClick}>
            Parsel ekle
          </button>
        )}
      </div>
    );
  }

  const footprintPolygon = deriveFootprintPolygon(mass.footprint.points, layoutDraft.footprint);
  const avgSetbackM = (layoutDraft.setback.frontM + layoutDraft.setback.sideM + layoutDraft.setback.rearM) / 3;
  const setbackRing = avgSetbackM > 0
    ? deriveFootprintPolygon(parcelPolygon.points, { centerX: 0, centerY: 0, rotationDeg: 0, scale: 1, insetM: avgSetbackM })
    : null;

  const warnings = dedupeWarnings([
    ...validateLayoutDraft(layoutDraft, parcelPolygon, programBands),
    ...classifyFootprintAgainstParcel(footprintPolygon, parcelPolygon.points, parcelPolygon.areaM2),
  ]);

  const viewBox = computeViewBox(parcelPolygon.points);
  const viewBoxAttr = `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`;

  const referencedBands = programBands.filter((band) => layoutDraft.programBandIds.includes(band.id));

  const frontage = layoutDraft.commercialFrontage;
  const frontageSegment = frontage && footprintPolygon.length >= 2
    ? [footprintPolygon[frontage.edgeIndex % footprintPolygon.length], footprintPolygon[(frontage.edgeIndex + 1) % footprintPolygon.length]]
    : null;

  return (
    <div className={styles.panel}>
      <div className={styles.gorunumAlani}>
        <svg
          className={styles.svg}
          viewBox={viewBoxAttr}
          role="img"
          aria-label="2D yerleşim tahtası"
        >
          {/* Katman 1: parsel — REFERANS, dolgu yok. */}
          <polygon
            data-testid="layout-parcel-polygon"
            points={toSvgPointsAttr(parcelPolygon.points, viewBox.y, viewBox.height)}
            fill="none"
            stroke="var(--muted)"
            strokeWidth={viewBox.width * 0.004}
          />

          {/* Katman 2: cekme mesafesi varsayimi — kesikli, ayri gorsel referans. */}
          {setbackRing && (
            <polygon
              data-testid="layout-setback-ring"
              points={toSvgPointsAttr(setbackRing, viewBox.y, viewBox.height)}
              fill="none"
              stroke="var(--muted)"
              strokeDasharray={`${viewBox.width * 0.006} ${viewBox.width * 0.006}`}
              strokeWidth={viewBox.width * 0.002}
            />
          )}

          {/* Katman 3: footprint — ONERI, dolgulu. */}
          <polygon
            data-testid="layout-footprint-polygon"
            points={toSvgPointsAttr(footprintPolygon, viewBox.y, viewBox.height)}
            fill="var(--primary)"
            fillOpacity={0.16}
            stroke="var(--primary)"
            strokeWidth={viewBox.width * 0.004}
          />

          {/* Katman 4: ticari cephe isareti. */}
          {frontageSegment && (
            <line
              data-testid="layout-commercial-frontage"
              x1={worldToSvg(frontageSegment[0], viewBox.y, viewBox.height).x}
              y1={worldToSvg(frontageSegment[0], viewBox.y, viewBox.height).y}
              x2={worldToSvg(frontageSegment[1], viewBox.y, viewBox.height).x}
              y2={worldToSvg(frontageSegment[1], viewBox.y, viewBox.height).y}
              stroke={PROGRAM_USE_COLORS.commercial}
              strokeWidth={viewBox.width * 0.012}
              strokeLinecap="round"
            />
          )}
        </svg>
      </div>

      <div className={styles.yanKolon}>
        {referencedBands.length > 0 && (
          <ul className={styles.legend} aria-label="Program bandı lejantı">
            {referencedBands.map((band) => (
              <li key={band.id} className={styles.legendSatiri}>
                <span className={styles.legendRenk} style={{ background: PROGRAM_USE_COLORS[band.use] }} aria-hidden="true" />
                {PROGRAM_USE_LABELS[band.use]}
              </li>
            ))}
          </ul>
        )}

        {warnings.length > 0 && (
          <ul className={styles.uyarilar} aria-label="Uyarılar">
            {warnings.map((warning) => (
              <li key={warning.code}>{warning.message}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
