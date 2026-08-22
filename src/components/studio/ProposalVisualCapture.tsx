import React from 'react';
import { generate2dSvgString } from '@/lib/studio/proposalAssets';
import type { StudioPolygon, StudioLayoutDraft, ParcelGeometrySourceKind } from '@/lib/studio/types';
import styles from './ProposalVisualCapture.module.css';

export interface ProposalVisualCaptureProps {
  parcelPolygon: StudioPolygon | null;
  footprintPolygon?: StudioPolygon | null;
  layoutDraft?: StudioLayoutDraft | null;
  parcelSourceStatus?: ParcelGeometrySourceKind;
  caption?: string;
}

export function ProposalVisualCapture({
  parcelPolygon,
  footprintPolygon,
  layoutDraft,
  parcelSourceStatus,
  caption,
}: ProposalVisualCaptureProps) {
  const svgString = React.useMemo(() => {
    return generate2dSvgString({
      parcelPolygon,
      footprintPolygon,
      layoutDraft,
      width: 600,
      height: 360,
    });
  }, [parcelPolygon, footprintPolygon, layoutDraft]);

  const isDemo = parcelSourceStatus === 'demo' || parcelSourceStatus === 'unavailable';

  return (
    <div className={styles.container} data-testid="proposal-visual-capture">
      <div className={styles.previewFrame}>
        <div
          className={styles.svgWrapper}
          dangerouslySetInnerHTML={{ __html: svgString }}
        />
        <div className={styles.badgeRow}>
          <span className={isDemo ? styles.demoBadge : styles.verifiedBadge}>
            {isDemo ? '⚠️ Demo Geometri' : '✓ TKGM Doğrulanmış'}
          </span>
        </div>
      </div>
      {caption && <p className={styles.caption}>{caption}</p>}
    </div>
  );
}
