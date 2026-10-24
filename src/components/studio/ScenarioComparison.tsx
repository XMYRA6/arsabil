'use client';

import React from 'react';
import styles from './ScenarioComparison.module.css';
import { formatStudioNumber } from './studioFormat';
import type { ScenarioComparisonRow } from '@/lib/studio/scenarioComparison';

export type ScenarioComparisonProps = {
  rows: ScenarioComparisonRow[];
  activeScenarioId: string;
  canAddMore?: boolean;
  onSelectScenario: (scenarioId: string) => void;
  onDeleteScenario?: (scenarioId: string) => void;
  onClose?: () => void;
};

/**
 * Faz 3B Task 4 — Alternatif Senaryo Karsilastirma Tablosu / Bento Kartlari.
 */
export function ScenarioComparison({
  rows,
  activeScenarioId,
  onSelectScenario,
  onDeleteScenario,
  onClose,
}: ScenarioComparisonProps) {
  return (
    <div className={styles.container} data-testid="scenario-comparison">
      <header className={styles.header}>
        <div className={styles.titleSection}>
          <h3 className={styles.title}>Senaryo Karşılaştırması</h3>
          <span className={styles.countBadge}>{rows.length} / 3 Aktif</span>
        </div>
        {onClose && (
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Kapat"
          >
            ✕
          </button>
        )}
      </header>

      <div className={styles.grid}>
        {rows.map((row) => {
          const isActive = row.scenarioId === activeScenarioId;

          return (
            <div
              key={row.scenarioId}
              className={`${styles.card} ${isActive ? styles.activeCard : ''}`}
            >
              <div className={styles.cardHeader}>
                <h4 className={styles.cardName}>{row.scenarioName}</h4>
                {isActive && <span className={styles.activeTag}>Aktif Taslak</span>}
              </div>

              <div className={styles.section}>
                <h5 className={styles.sectionTitle}>Alan & Program</h5>
                <div className={styles.metricRow}>
                  <span className={styles.metricLabel}>Tahsis Edilen Alan</span>
                  <span className={styles.metricValue}>
                    {formatStudioNumber(row.totalAllocatedAreaM2)} m²
                  </span>
                </div>
                <div className={styles.metricRow}>
                  <span className={styles.metricLabel}>Konut Dağılımı</span>
                  <span className={styles.metricValue}>
                    {row.totalResidentialUnits} daire
                    {Object.entries(row.residentialUnitCountByType).length > 0 && (
                      <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 4 }}>
                        ({Object.entries(row.residentialUnitCountByType)
                          .filter(([_, count]) => (count ?? 0) > 0)
                          .map(([type, count]) => `${count}x ${type}`)
                          .join(', ')})
                      </span>
                    )}
                  </span>
                </div>
                <div className={styles.metricRow}>
                  <span className={styles.metricLabel}>Ticari Alan</span>
                  <span className={styles.metricValue}>
                    {row.commercialUnitCount > 0
                      ? `${row.commercialUnitCount} dükkan (${formatStudioNumber(row.commercialAreaM2)} m²)`
                      : 'Yok'}
                  </span>
                </div>
              </div>

              <div className={styles.section}>
                <h5 className={styles.sectionTitle}>Arsa Sahibi Teklifi</h5>
                <div className={styles.metricRow}>
                  <span className={styles.metricLabel}>Hak Ediş</span>
                  <span className={styles.metricValue}>
                    {row.landownerEntitledUnits.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} daire
                  </span>
                </div>
                <div className={styles.metricRow}>
                  <span className={styles.metricLabel}>Önerilen / Teklif</span>
                  <span className={styles.metricValue}>
                    {row.landownerOfferedUnits} tam daire
                  </span>
                </div>
                <div className={styles.metricRow}>
                  <span className={styles.metricLabel}>Nakit Dengeleme</span>
                  <span className={styles.metricValue}>
                    {row.cashEqualizationStatus === 'assumption_required' ? (
                      <span className={styles.assumptionTag}>Varsayım gerekli</span>
                    ) : row.landownerCashEqualizationTl !== null ? (
                      `${formatStudioNumber(row.landownerCashEqualizationTl)} ₺`
                    ) : (
                      '—'
                    )}
                  </span>
                </div>
              </div>

              {row.needsRebalance && (
                <div className={styles.rebalanceWarning}>
                  Yerleşim/program değişti; teklif dengesini gözden geçir.
                </div>
              )}

              <div className={styles.cardFooter}>
                {!isActive ? (
                  <button
                    type="button"
                    className={styles.selectBtn}
                    onClick={() => onSelectScenario(row.scenarioId)}
                    aria-label={`Aktif Yap: ${row.scenarioName}`}
                  >
                    Aktif Yap
                  </button>
                ) : (
                  <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>
                    Şu an düzenleniyor
                  </span>
                )}

                {!isActive && onDeleteScenario && rows.length > 1 && (
                  <button
                    type="button"
                    className={styles.deleteBtn}
                    onClick={() => onDeleteScenario(row.scenarioId)}
                    aria-label={`Alternatifi Sil: ${row.scenarioName}`}
                  >
                    Sil
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
