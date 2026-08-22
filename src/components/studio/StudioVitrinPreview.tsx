'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { isWebGLAvailable } from './webglSupport';
import { StudioSceneBoundary } from './StudioSceneBoundary';
import type { StudioSnapshotDraft } from '@/lib/studio/types';
import styles from './StudioVitrinPreview.module.css';

const StudioVitrinScene = dynamic(
  () => import('./StudioVitrinScene').then((mod) => mod.StudioVitrinScene),
  {
    ssr: false,
    loading: () => <div className={styles.canvasLoading}>3D vitrin sahnesi yükleniyor…</div>,
  }
);

export interface StudioVitrinPreviewProps {
  snapshot: StudioSnapshotDraft | null;
}

export function StudioVitrinPreview({ snapshot }: StudioVitrinPreviewProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!snapshot || !snapshot.buildingMass) {
    return (
      <div className={styles.emptyBox}>
        <span>3D Vitrin için veri bekleniyor…</span>
      </div>
    );
  }

  const webglSupported = isWebGLAvailable();

  return (
    <div className={styles.container} data-testid="studio-vitrin-preview">
      {!isOpen ? (
        <div className={styles.previewClosed}>
          <h3 className={styles.closedTitle}>3D Vitrin & Çevre Görselleştirmesi</h3>
          <p className={styles.closedSubtitle}>
            Pencereli prosedürel kütle, site bağlamı ağaçları ve PBR asfalt yolu içeren zengin 3D vitrin görünümü.
          </p>
          <button
            type="button"
            className={styles.showButton}
            onClick={() => setIsOpen(true)}
            aria-label="3D Vitrini Göster"
          >
            🏢 3D Vitrini Göster
          </button>
        </div>
      ) : !webglSupported ? (
        <div className={styles.fallbackBox}>
          <h4 className={styles.fallbackTitle}>3D Sahne Desteklenmiyor</h4>
          <p className={styles.fallbackText}>
            Tarayıcınızda veya cihazınızda WebGL donanım hızlandırması desteklenmiyor. Aşağıdaki metin özet ve 2D plan görünümünden devam edebilirsiniz.
          </p>
        </div>
      ) : (
        <div className={styles.sceneWrapper}>
          <div className={styles.topBar}>
            <span className={styles.badge}>✨ 3D Vitrin Önizleme</span>
            <button
              type="button"
              className={styles.hideButton}
              onClick={() => setIsOpen(false)}
              aria-label="3D Vitrini Gizle"
            >
              Kapat
            </button>
          </div>

          <StudioSceneBoundary fallback={<div className={styles.canvasLoading}>3D vitrin sahnesi yüklenemedi.</div>}>
            <StudioVitrinScene snapshot={snapshot} />
          </StudioSceneBoundary>
        </div>
      )}

      {isOpen && (
        <p className={styles.disclaimer}>
          * Bu görsel bir ön fizibilite prototipidir; bağlayıcı bir mimari çizim, resmi imar onayı veya taahhüt değildir.
        </p>
      )}
    </div>
  );
}
