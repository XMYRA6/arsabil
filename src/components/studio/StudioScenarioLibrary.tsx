"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './StudioScenarioLibrary.module.css';
import type {
  StudioScenarioRecord,
  StudioScenarioVersionRecord,
  StudioScenarioVersionSummary,
} from '@/lib/studio/persistenceTypes';

export type StudioScenarioLibraryProps = {
  isOpen: boolean;
  onClose: () => void;
  onLoadScenarioVersion: (scenario: StudioScenarioRecord, versionRecord: StudioScenarioVersionRecord) => void;
  currentScenarioId?: string | null;
};

export function StudioScenarioLibrary({
  isOpen,
  onClose,
  onLoadScenarioVersion,
  currentScenarioId,
}: StudioScenarioLibraryProps) {
  const [scenarios, setScenarios] = useState<StudioScenarioRecord[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedScenarioId, setExpandedScenarioId] = useState<string | null>(null);
  const [scenarioVersions, setScenarioVersions] = useState<Record<string, StudioScenarioVersionSummary[]>>({});
  const [loadingVersionId, setLoadingVersionId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    setLoading(true);

    fetch('/api/studio/scenarios')
      .then((res) => res.json())
      .then((data) => {
        if (mounted && data?.scenarios) {
          setScenarios(data.scenarios);
        }
      })
      .catch((err) => console.error('[StudioScenarioLibrary]', err))
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredScenarios = scenarios.filter((sc) => {
    if (!search.trim()) return true;
    return sc.name.toLowerCase().includes(search.trim().toLowerCase());
  });

  const toggleVersions = async (scenarioId: string) => {
    if (expandedScenarioId === scenarioId) {
      setExpandedScenarioId(null);
      return;
    }

    setExpandedScenarioId(scenarioId);

    if (!scenarioVersions[scenarioId]) {
      try {
        const res = await fetch(`/api/studio/scenarios/${scenarioId}/versions`);
        const data = await res.json();
        if (data?.versions) {
          setScenarioVersions((prev) => ({
            ...prev,
            [scenarioId]: data.versions,
          }));
        }
      } catch (err) {
        console.error('[StudioScenarioLibrary toggleVersions]', err);
      }
    }
  };

  const handleOpenVersion = async (scenario: StudioScenarioRecord, versionNumber: number) => {
    setLoadingVersionId(`${scenario.id}-${versionNumber}`);
    try {
      const res = await fetch(`/api/studio/scenarios/${scenario.id}/versions/${versionNumber}`);
      const data = await res.json();
      if (res.ok && data?.version) {
        onLoadScenarioVersion(scenario, data.version);
        onClose();
      } else {
        alert(data?.message || 'Versiyon yüklenemedi.');
      }
    } catch (err: any) {
      alert(err.message || 'Versiyon yüklenirken bir hata oluştu.');
    } finally {
      setLoadingVersionId(null);
    }
  };

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true" data-testid="studio-scenario-library">
      <div className={styles.drawer}>
        <div className={styles.header}>
          <div className={styles.titleGroup}>
            <h3 className={styles.title}>Senaryo Kütüphanesi</h3>
            <span className={styles.countBadge}>{scenarios.length} Kayıtlı</span>
          </div>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Kapat"
          >
            ✕
          </button>
        </div>

        <div className={styles.toolbar}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Senaryo başlığı ile ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className={styles.content}>
          {loading ? (
            <div className={styles.emptyState}>Senaryolar yükleniyor...</div>
          ) : filteredScenarios.length === 0 ? (
            <div className={styles.emptyState}>
              {search.trim()
                ? 'Aramanızla eşleşen senaryo bulunamadı.'
                : 'Henüz kaydedilmiş bir senaryonuz bulunmuyor. "Kaydet" butonu ile ilk senaryonuzu buluta kaydedebilirsin.'}
            </div>
          ) : (
            filteredScenarios.map((scenario) => {
              const isCurrent = scenario.id === currentScenarioId;
              const isVerified = scenario.parcelSourceStatus === 'verified_tkgm';
              const parcelLoc = scenario.parcelIdentity
                ? `${scenario.parcelIdentity.il || ''} ${scenario.parcelIdentity.ilce || ''}`.trim()
                : 'Konum belirtilmedi';
              const isExpanded = expandedScenarioId === scenario.id;
              const versions = scenarioVersions[scenario.id] || [];

              return (
                <div
                  key={scenario.id}
                  className={`${styles.card} ${isCurrent ? styles.cardActive : ''}`}
                  data-testid={`scenario-card-${scenario.id}`}
                >
                  <div className={styles.cardHeader}>
                    <div>
                      <h4 className={styles.cardTitle}>{scenario.name}</h4>
                      <div className={styles.cardMeta}>
                        {parcelLoc} • Son güncelleme: {new Date(scenario.updatedAt).toLocaleDateString('tr-TR')}
                      </div>
                    </div>

                    <div className={styles.badgeRow}>
                      <span
                        className={`${styles.badge} ${
                          isVerified ? styles.badgeVerified : styles.badgeDemo
                        }`}
                      >
                        {isVerified ? 'TKGM' : 'Demo'}
                      </span>
                      <span className={`${styles.badge} ${styles.badgeVersion}`}>
                        v{scenario.currentVersionNumber}
                      </span>
                      {scenario.latestVersion?.needsRebalance && (
                        <span className={`${styles.badge} ${styles.badgeWarning}`}>
                          Dengeleme Gerekli
                        </span>
                      )}
                    </div>
                  </div>

                  <div className={styles.actions}>
                    <button
                      type="button"
                      className={styles.openBtn}
                      disabled={loadingVersionId === `${scenario.id}-${scenario.currentVersionNumber}`}
                      onClick={() => handleOpenVersion(scenario, scenario.currentVersionNumber)}
                    >
                      {loadingVersionId === `${scenario.id}-${scenario.currentVersionNumber}`
                        ? 'Yükleniyor...'
                        : 'Taslak Olarak Aç'}
                    </button>

                    <button
                      type="button"
                      className={styles.versionsToggleBtn}
                      onClick={() => toggleVersions(scenario.id)}
                    >
                      {isExpanded ? 'Versiyonları Gizle' : `Tüm Versiyonlar (${scenario.currentVersionNumber})`}
                    </button>

                    <Link
                      href={`/studio/scenarios/${scenario.id}/versions/${scenario.currentVersionNumber}/vitrin`}
                      className={styles.vitrinLink}
                    >
                      3D Vitrin
                    </Link>
                  </div>

                  {isExpanded && (
                    <div className={styles.versionList}>
                      {versions.length === 0 ? (
                        <div className={styles.versionDate}>Versiyonlar yükleniyor...</div>
                      ) : (
                        versions.map((ver) => (
                          <div key={ver.id} className={styles.versionItem}>
                            <div className={styles.versionInfo}>
                              <span className={styles.versionTitle}>Versiyon {ver.versionNumber}</span>
                              <span className={styles.versionDate}>
                                {new Date(ver.createdAt).toLocaleString('tr-TR')}
                              </span>
                              {ver.summaryNotes && (
                                <span className={styles.versionNotes}>"{ver.summaryNotes}"</span>
                              )}
                            </div>
                            <div className={styles.versionActions}>
                              <button
                                type="button"
                                className={styles.versionOpenBtn}
                                disabled={loadingVersionId === `${scenario.id}-${ver.versionNumber}`}
                                onClick={() => handleOpenVersion(scenario, ver.versionNumber)}
                              >
                                {loadingVersionId === `${scenario.id}-${ver.versionNumber}`
                                  ? '...'
                                  : 'Bu Versiyonu Aç'}
                              </button>
                              <Link
                                href={`/studio/scenarios/${scenario.id}/versions/${ver.versionNumber}/vitrin`}
                                className={styles.vitrinLink}
                              >
                                3D Vitrin
                              </Link>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
