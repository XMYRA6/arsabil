'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import type { StudioProposalViewModel } from '@/lib/studio/proposalViewModel';
import { StudioProposalPreview } from '@/components/studio/StudioProposalPreview';
import { generate2dSvgString, svgToDataUri } from '@/lib/studio/proposalAssets';
import styles from './page.module.css';

export interface SharedProposalClientProps {
  viewModel: StudioProposalViewModel;
  token: string;
  expiresAt: string | null;
  createdAt: string;
}

export function SharedProposalClient({
  viewModel,
  expiresAt,
}: SharedProposalClientProps) {
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const svgDataUri = useMemo(() => {
    // 2D SVG data URI'sini hazırla
    const svgString = generate2dSvgString({
      parcelPolygon: null, // Minimal vector representation
      width: 600,
      height: 360,
    });
    return svgToDataUri(svgString);
  }, []);

  const handleDownloadPdf = async () => {
    try {
      setIsDownloadingPdf(true);
      const { downloadStudioProposalPdf } = await import('@/lib/pdf/studioProposalPdfGenerator');
      await downloadStudioProposalPdf(viewModel, svgDataUri);
    } catch (err) {
      console.error('PDF indirme hatası:', err);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const expiresDateStr = expiresAt
    ? new Date(expiresAt).toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  return (
    <div className={styles.pageContainer}>
      {/* Top Banner */}
      <nav className={styles.topNav}>
        <div className={styles.navContent}>
          <div className={styles.brandGroup}>
            <Link href="/" className={styles.brandLink} aria-label="ArsaBil">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M2 20 9 6h3L5 20z" /><path d="M11 20 16 10l5 10z" /></svg>
              <strong className={styles.brandText}>ArsaBil</strong>
            </Link>
            <span className={styles.shareBadge}>Paylaşılan öneri</span>
          </div>

          <div className={styles.navActions}>
            <Link href="/hesapla" className={styles.calcCtaButton}>
              Kendi Projeni Modelle →
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className={styles.mainContent}>
        {expiresDateStr && (
          <div className={styles.expiryNotice}>
            <span>ℹ️ Bu teklif bağlantısı <strong>{expiresDateStr}</strong> tarihine kadar geçerlidir.</span>
          </div>
        )}

        <StudioProposalPreview
          viewModel={viewModel}
          onDownloadPdf={handleDownloadPdf}
          isDownloadingPdf={isDownloadingPdf}
        />

        <div className={styles.bottomCtaBox}>
          <h3>Kendi Parselin İçin Değerleme & Ön Teklif Senaryosu Oluştur</h3>
          <p>
            ArsaBil Studio ile parsel geometrinizi doğrula, TAKS/KAKS sınırlarına göre kat kütlesi türetin ve şeffaf teklif alternatifleri hazırla.
          </p>
          <Link href="/hesapla" className={styles.largeCtaButton}>
            Ücretsiz Hesaplamaya Başla →
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className={styles.pageFooter}>
        <p>© 2026 ArsaBil — Türkiye&apos;nin Arsa Payı ve Kat Karşılığı Modelleme Platformu</p>
      </footer>
    </div>
  );
}
