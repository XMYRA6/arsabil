import React from 'react';
import type { StudioProposalViewModel } from '@/lib/studio/proposalViewModel';
import { ProposalVisualCapture } from './ProposalVisualCapture';
import type { StudioPolygon, StudioLayoutDraft } from '@/lib/studio/types';
import styles from './StudioProposalPreview.module.css';

export interface StudioProposalPreviewProps {
  viewModel: StudioProposalViewModel;
  parcelPolygon?: StudioPolygon | null;
  footprintPolygon?: StudioPolygon | null;
  layoutDraft?: StudioLayoutDraft | null;
  onDownloadPdf?: () => void;
  isDownloadingPdf?: boolean;
}

export function StudioProposalPreview({
  viewModel,
  parcelPolygon,
  footprintPolygon,
  layoutDraft,
  onDownloadPdf,
  isDownloadingPdf,
}: StudioProposalPreviewProps) {
  const {
    projectContext,
    massingAnd2D,
    programSummary,
    landownerOfferSummary,
    financialAssumptions,
    warningsAndBadges,
  } = viewModel;

  return (
    <article className={styles.proposalCard} data-testid="studio-proposal-preview">
      {/* 1. Başlık ve Üst Bilgi */}
      <header className={styles.header}>
        <div className={styles.headerTitleGroup}>
          <div className={styles.tagRow}>
            <span className={styles.versionTag}>Versiyon {projectContext.versionNumber}</span>
            <span className={warningsAndBadges.isDemoGeometry ? styles.demoTag : styles.verifiedTag}>
              {warningsAndBadges.sourceBadgeLabel}
            </span>
          </div>
          <h1 className={styles.title}>{projectContext.scenarioName}</h1>
          <p className={styles.metaSubtitle}>
            {projectContext.parcelIdentity
              ? `${projectContext.parcelIdentity.il} / ${projectContext.parcelIdentity.ilce} / ${projectContext.parcelIdentity.mahalle} ${projectContext.parcelIdentity.adaNo}/${projectContext.parcelIdentity.parselNo}`
              : 'Parsel konumu belirtilmemiş'}
            {' · '}
            {projectContext.createdAtFormatted}
          </p>
        </div>

        {onDownloadPdf && (
          <div className={styles.headerActions}>
            <button
              type="button"
              className={styles.pdfButton}
              onClick={onDownloadPdf}
              disabled={isDownloadingPdf || warningsAndBadges.needsRebalance}
            >
              {isDownloadingPdf ? '⏳ Hazırlanıyor...' : '📄 PDF İndir'}
            </button>
          </div>
        )}
      </header>

      {/* 2. Görsel 2D Yerleşim & Kütle Özeti */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Yerleşim & Yapı Özeti</h2>
        <div className={styles.gridTwoColumns}>
          <div className={styles.visualColumn}>
            <ProposalVisualCapture
              parcelPolygon={parcelPolygon ?? null}
              footprintPolygon={footprintPolygon ?? null}
              layoutDraft={layoutDraft ?? null}
              parcelSourceStatus={projectContext.parcelSourceStatus}
              caption="2D Parsel ve Bina Yerleşim Taslağı"
            />
          </div>

          <div className={styles.statCardsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Parsel Alanı</span>
              <span className={styles.statValue}>
                {projectContext.parcelAreaM2.toLocaleString('tr-TR')} m²
              </span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Toplam İnşaat Alanı</span>
              <span className={styles.statValue}>
                {projectContext.grossConstructionAreaM2.toLocaleString('tr-TR')} m²
              </span>
              <span className={styles.statHint}>{projectContext.grossConstructionAreaSource}</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Bina Taban Alanı (TAKS)</span>
              <span className={styles.statValue}>
                {massingAnd2D.footprintAreaM2.toLocaleString('tr-TR')} m²
                <span className={styles.statPercent}> (%{massingAnd2D.coveragePercentage})</span>
              </span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Kat Adedi / Yükseklik</span>
              <span className={styles.statValue}>
                {massingAnd2D.floorCount} Kat / {massingAnd2D.buildingHeightM}m
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Program Dağılımı */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Fonksiyon & Program Dağılımı</h2>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Fonksiyon</th>
                <th>Birim Adedi</th>
                <th>Ort. Alan</th>
                <th>Toplam Tahsis</th>
              </tr>
            </thead>
            <tbody>
              {programSummary.items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.useLabel}</strong>
                  </td>
                  <td>{item.unitCount} adet</td>
                  <td>{item.averageUnitAreaM2} m²</td>
                  <td>{item.allocatedAreaM2.toLocaleString('tr-TR')} m²</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>
                  <strong>Toplam Tahsis</strong>
                </td>
                <td>
                  <strong>{programSummary.residentialUnitCount + programSummary.commercialUnitCount} bağımsız bölüm</strong>
                </td>
                <td>—</td>
                <td>
                  <strong>{programSummary.totalAllocatedAreaM2.toLocaleString('tr-TR')} m²</strong>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* 4. Arsa Sahibi Teklifi & Hak Ediş */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Arsa Sahibi Teklif Özeti</h2>
        <div className={styles.offerHighlightBox}>
          <div className={styles.offerMainCard}>
            <span className={styles.offerMainLabel}>Hesaplanan Hak Ediş</span>
            <span className={styles.offerMainValue}>
              {landownerOfferSummary.entitledUnitCount.toFixed(2)} Daire
            </span>
          </div>

          <div className={styles.offerDetailsColumn}>
            <div className={styles.offerDetailRow}>
              <span>Önerilen Tam Bağımsız Bölüm:</span>
              <strong>{landownerOfferSummary.offeredWholeUnits} Daire</strong>
            </div>

            {landownerOfferSummary.fractionalUnitBalance !== 0 && (
              <div className={styles.offerDetailRow}>
                <span>Kesirli Pay Dengesi:</span>
                <strong>
                  {landownerOfferSummary.fractionalUnitBalance > 0
                    ? `+${landownerOfferSummary.fractionalUnitBalance.toFixed(2)} daire payı`
                    : `${landownerOfferSummary.fractionalUnitBalance.toFixed(2)} daire payı`}
                </strong>
              </div>
            )}

            {landownerOfferSummary.cashEqualizationTl != null && (
              <div className={styles.offerDetailRow}>
                <span>Nakit Eşitleme / Mahsup Tutarı:</span>
                <strong className={styles.cashHighlight}>
                  {landownerOfferSummary.cashEqualizationTl.toLocaleString('tr-TR')} TL
                </strong>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 5. Değerleme Varsayımları */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Değerleme ve Finansal Parametreler</h2>
        <div className={styles.assumptionsGrid}>
          <div className={styles.assumptionItem}>
            <span>Daire Satış Değeri (Ortalama)</span>
            <strong>
              {financialAssumptions.unitValueTl != null
                ? `${financialAssumptions.unitValueTl.toLocaleString('tr-TR')} ${financialAssumptions.currency}`
                : 'Belirtilmedi'}
            </strong>
          </div>
          <div className={styles.assumptionItem}>
            <span>Dükkan / Ticari Satış Değeri</span>
            <strong>
              {financialAssumptions.shopValueTl != null
                ? `${financialAssumptions.shopValueTl.toLocaleString('tr-TR')} ${financialAssumptions.currency}`
                : 'Belirtilmedi'}
            </strong>
          </div>
          <div className={styles.assumptionItem}>
            <span>Değerleme Tarihi</span>
            <strong>{financialAssumptions.valuationDate || 'Belirtilmedi'}</strong>
          </div>
        </div>
      </section>

      {/* 6. Yasal Sorumluluk Reddi & Uyarilar */}
      <footer className={styles.footer}>
        {warningsAndBadges.warnings.length > 0 && (
          <div className={styles.warningsContainer}>
            <span className={styles.warningsTitle}>Dikkat Edilmesi Gereken Hususlar:</span>
            <ul className={styles.warningsList}>
              {warningsAndBadges.warnings.map((w, idx) => (
                <li key={idx}>{w.message}</li>
              ))}
            </ul>
          </div>
        )}
        <p className={styles.disclaimerText}>{landownerOfferSummary.disclaimerText}</p>
      </footer>
    </article>
  );
}
