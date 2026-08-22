'use client';

import styles from './StudioFallback.module.css';
import { formatStudioNumber } from './studioFormat';
import { footprintToSvgPoints } from './footprintSchema';
import { getFloorBandHeights } from './floorBands';
import { STUDIO_SCENE_COLORS } from './studioVisualTokens';
import type { BuildingMass } from '@/lib/studio/types';

export type StudioFallbackReason = 'unsupported' | 'error';

type StudioFallbackProps = {
  mass: BuildingMass;
  reason: StudioFallbackReason;
};

const reasonCopy: Record<StudioFallbackReason, string> = {
  unsupported: 'Bu cihaz/tarayıcıda WebGL desteklenmiyor. Aynı karar için gereken tüm veriler aşağıda metin olarak sunulur.',
  error: '3D önizleme yüklenemedi. Aynı karar için gereken tüm veriler aşağıda metin olarak sunulur.',
};

/**
 * WebGL yok/canvas hata verdi durumlarinda kutle icin canvas gerektirmeyen
 * HTML ozet — footprint semasi + metrik tablosu (Faz 1B Task 3). Ayni `mass`
 * kaynagini `StudioScene`/`StudioPreview.summaryGrid` ile paylasir; hicbir
 * sayi burada YENIDEN hesaplanmaz.
 */
export function StudioFallback({ mass, reason }: StudioFallbackProps) {
  const svgPoints = footprintToSvgPoints(mass.footprint.points);
  const floorBandCount = getFloorBandHeights(mass).length;

  return (
    <div className={styles.fallback}>
      <p className={styles.reason}>{reasonCopy[reason]}</p>

      <div className={styles.schemaShell}>
        <svg
          className={styles.schema}
          viewBox="0 0 100 100"
          role="img"
          aria-label="Parsel footprint şeması"
        >
          {svgPoints && (
            <polygon
              points={svgPoints}
              fill={STUDIO_SCENE_COLORS.massFill}
              fillOpacity={0.18}
              stroke={STUDIO_SCENE_COLORS.massFill}
              strokeWidth={1.5}
            />
          )}
        </svg>
      </div>

      <table className={styles.metricTable}>
        <tbody>
          <tr>
            <th scope="row">Kat tahmini</th>
            <td>{mass.floorCount}</td>
          </tr>
          <tr>
            <th scope="row">Yükseklik</th>
            <td>{formatStudioNumber(mass.heightM)} m</td>
          </tr>
          <tr>
            <th scope="row">Brüt inşaat</th>
            <td>{formatStudioNumber(mass.grossConstructionAreaM2)} m²</td>
          </tr>
          <tr>
            <th scope="row">Kat bandı sayısı</th>
            <td>{floorBandCount}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
