'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { isWebGLAvailable } from './webglSupport';
import { StudioSceneBoundary } from './StudioSceneBoundary';
import type { StudioSnapshotDraft } from '@/lib/studio/types';
import type { VitrinCaptureHandle } from './StudioVitrinCapture';
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
  scenarioId?: string;
  versionNumber?: number;
  isPro?: boolean;
}

type RenderState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; imageUrl: string };

export function StudioVitrinPreview({ snapshot, scenarioId, versionNumber, isPro }: StudioVitrinPreviewProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [renderState, setRenderState] = useState<RenderState>({ status: 'idle' });
  const [captureHandle, setCaptureHandle] = useState<VitrinCaptureHandle | null>(null);

  if (!snapshot || !snapshot.buildingMass) {
    return (
      <div className={styles.emptyBox}>
        <span>3D Vitrin için veri bekleniyor…</span>
      </div>
    );
  }

  const webglSupported = isWebGLAvailable();
  const hasRenderTarget = Boolean(scenarioId && versionNumber && webglSupported);
  const canGenerateRender = Boolean(isPro && hasRenderTarget);

  async function handleGenerateRender() {
    const handle = captureHandle;
    if (!handle) {
      setRenderState({ status: 'error', message: 'Sahne henüz hazır değil, tekrar dene.' });
      return;
    }

    setRenderState({ status: 'loading' });
    try {
      const frame = handle.captureFrame();
      const res = await fetch(`/api/studio/scenarios/${scenarioId}/versions/${versionNumber}/render`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          colorImageDataUrl: frame.colorImageDataUrl,
          depthImageDataUrl: frame.depthImageDataUrl,
          cameraPosition: frame.cameraPosition,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setRenderState({ status: 'error', message: data?.message || 'Render üretilemedi.' });
        return;
      }

      const data = (await res.json()) as { imageUrl: string };
      setRenderState({ status: 'success', imageUrl: data.imageUrl });
    } catch {
      setRenderState({ status: 'error', message: 'Bağlantı hatası, tekrar dene.' });
    }
  }

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
            3D Vitrini Göster
          </button>
        </div>
      ) : !webglSupported ? (
        <div className={styles.fallbackBox}>
          <h4 className={styles.fallbackTitle}>3D Sahne Desteklenmiyor</h4>
          <p className={styles.fallbackText}>
            Tarayıcında veya cihazında WebGL donanım hızlandırması desteklenmiyor. Aşağıdaki metin özet ve 2D plan görünümünden devam edebilirsin.
          </p>
        </div>
      ) : (
        <div className={styles.sceneWrapper}>
          <div className={styles.topBar}>
            <span className={styles.badge}>3D Vitrin Önizleme</span>
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
            <StudioVitrinScene snapshot={snapshot} onCaptureReady={setCaptureHandle} />
          </StudioSceneBoundary>
        </div>
      )}

      {isOpen && hasRenderTarget && !isPro && (
        <div className={styles.renderLockedCta} data-testid="studio-render-locked-cta">
          <p className={styles.lockedTitle}>Fotogerçekçi Görsel — PRO plana özel</p>
          <p className={styles.lockedText}>
            Kütlenizin arsanızdaki fotogerçekçi görselini saniyeler içinde üretin — ortağınıza
            ve arsa sahibine göstermek için.
          </p>
          <Link href="/contact" className={styles.lockedLink}>
            Bilgi al →
          </Link>
        </div>
      )}

      {isOpen && canGenerateRender && (
        <div className={styles.renderPanel}>
          <button
            type="button"
            className={styles.renderButton}
            onClick={handleGenerateRender}
            disabled={renderState.status === 'loading'}
          >
            {renderState.status === 'loading' ? 'Fotogerçekçi görsel hazırlanıyor…' : 'Fotogerçekçi Görsel'}
          </button>
          {renderState.status === 'error' && <p className={styles.renderError}>{renderState.message}</p>}
          {renderState.status === 'success' && (
            <div className={styles.renderResult}>
              <img
                src={renderState.imageUrl}
                alt="Fotogerçekçi bina görseli"
                className={styles.renderImage}
              />
            </div>
          )}
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
