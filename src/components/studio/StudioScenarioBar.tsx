'use client';

import React, { useState, useEffect, useRef } from 'react';
import styles from './StudioScenarioBar.module.css';
import type { ScenarioHistoryEntry, StudioScenarioDraft } from '@/lib/studio/types';

export type StudioScenarioBarProps = {
  activeScenario: StudioScenarioDraft;
  allScenarios?: StudioScenarioDraft[];
  canUndo: boolean;
  canRedo: boolean;
  isDirty: boolean;
  needsRebalance?: boolean;
  historyEntries?: ScenarioHistoryEntry[];
  onUndo: () => void;
  onRedo: () => void;
  onNameChange: (newName: string) => void;
  onAddAlternative?: () => void;
  onCompareClick?: () => void;
  onSelectScenario?: (scenarioId: string) => void;
  onRebalanceClick?: () => void;
  onSaveClick?: () => void;
  onLibraryClick?: () => void;
  onShareClick?: () => void;
  onPdfClick?: () => void;
  savedScenarioId?: string | null;
  savedScenarioVersionNumber?: number | null;
};

/**
 * Faz 3B & 4A & 4B — Senaryo Çubuğu, Geri Al / İleri Al, Kayıt, Paylaşım ve Kütüphane Kontrolleri.
 *
 * Global Constraints:
 * - "Kaydedildi" ifadesi kalici sunucu kaydi yoksa KULLANILMAZ; "bu oturumda taslak" denir.
 * - Undo/Redo yalnizca Studio degisikliklerini etkiler; diger form alanlarini etkilemez.
 */
export function StudioScenarioBar({
  activeScenario,
  allScenarios = [activeScenario],
  canUndo,
  canRedo,
  isDirty,
  needsRebalance = false,
  historyEntries = [],
  onUndo,
  onRedo,
  onNameChange,
  onAddAlternative,
  onCompareClick,
  onSelectScenario,
  onRebalanceClick,
  onSaveClick,
  onLibraryClick,
  onShareClick,
  onPdfClick,
  savedScenarioId,
  savedScenarioVersionNumber,
}: StudioScenarioBarProps) {
  const [showHistory, setShowHistory] = useState(false);
  const historyRef = useRef<HTMLDivElement>(null);

  // Klavye kısayolları: Ctrl+Z / Cmd+Z (undo), Ctrl+Shift+Z / Cmd+Shift+Z veya Ctrl+Y (redo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput =
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        (document.activeElement as HTMLElement)?.isContentEditable;

      // Kullanici baska bir form girdi alaninda metin yazarken engelleme
      if (isInput && document.activeElement?.className !== styles.scenarioNameInput) {
        return;
      }

      const isMac = typeof window !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
      const isMod = isMac ? e.metaKey : e.ctrlKey;

      if (isMod && !e.altKey) {
        if (e.key.toLowerCase() === 'z') {
          if (e.shiftKey) {
            if (canRedo) {
              e.preventDefault();
              onRedo();
            }
          } else {
            if (canUndo) {
              e.preventDefault();
              onUndo();
            }
          }
        } else if (e.key.toLowerCase() === 'y' && !isMac) {
          if (canRedo) {
            e.preventDefault();
            onRedo();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canUndo, canRedo, onUndo, onRedo]);

  // Click outside to close history
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (historyRef.current && !historyRef.current.contains(e.target as Node)) {
        setShowHistory(false);
      }
    };
    if (showHistory) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showHistory]);

  return (
    <div className={styles.scenarioBar} data-testid="studio-scenario-bar">
      <div className={styles.leftSection}>
        {allScenarios.length > 1 && onSelectScenario ? (
          <select
            className={styles.scenarioSelect}
            value={activeScenario.id}
            onChange={(e) => onSelectScenario(e.target.value)}
            aria-label="Senaryo seçin"
          >
            {allScenarios.map((sc) => (
              <option key={sc.id} value={sc.id}>
                {sc.name}
              </option>
            ))}
          </select>
        ) : null}

        <input
          type="text"
          className={styles.scenarioNameInput}
          value={activeScenario.name}
          onChange={(e) => onNameChange(e.target.value)}
          aria-label="Senaryo adı"
          title="Senaryo adını düzenlemek için tıklayın"
        />

        <span className={styles.draftBadge} title="Bu veriler yalnızca tarayıcı oturumunuzda tutulmaktadır">
          <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: isDirty ? '#f59e0b' : '#10b981' }} />
          Bu oturumda taslak
        </span>

        {needsRebalance && (
          <button
            type="button"
            className={styles.rebalanceBadge}
            onClick={onRebalanceClick}
            title="Yerleşim veya program değişti; teklif dengesini gözden geçirin"
          >
            ⚠️ Teklifi dengele
          </button>
        )}
      </div>

      <div className={styles.centerSection}>
        <button
          type="button"
          className={styles.actionBtn}
          onClick={onUndo}
          disabled={!canUndo}
          aria-label="Geri al"
          title="Geri al (Ctrl+Z)"
        >
          ↶
        </button>

        <button
          type="button"
          className={styles.actionBtn}
          onClick={onRedo}
          disabled={!canRedo}
          aria-label="İleri al"
          title="İleri al (Ctrl+Shift+Z)"
        >
          ↷
        </button>
      </div>

      <div className={styles.rightSection} ref={historyRef}>
        <button
          type="button"
          className={styles.actionBtn}
          onClick={() => setShowHistory((prev) => !prev)}
          aria-label="Geçmiş"
          aria-expanded={showHistory}
        >
          Geçmiş {historyEntries.length > 0 ? `(${historyEntries.length})` : ''}
        </button>

        {onSaveClick && (
          <button
            type="button"
            className={`${styles.actionBtn} ${styles.primaryActionBtn}`}
            onClick={onSaveClick}
            aria-label="Kaydet"
            title="Senaryoyu veya yeni versiyonu buluta kaydedin"
          >
            Kaydet
          </button>
        )}

        {onLibraryClick && (
          <button
            type="button"
            className={styles.actionBtn}
            onClick={onLibraryClick}
            aria-label="Kütüphane"
            title="Kayıtlı senaryolarınızı ve versiyon geçmişini görüntüleyin"
          >
            Kütüphane
          </button>
        )}

        {onShareClick && (
          <button
            type="button"
            className={styles.actionBtn}
            onClick={onShareClick}
            aria-label="Paylaş"
            title="Senaryo teklifini güvenli bağlantıyla paylaşın"
          >
            Paylaş
          </button>
        )}

        {onPdfClick && (
          <button
            type="button"
            className={styles.actionBtn}
            onClick={onPdfClick}
            aria-label="Teklif PDF'i"
            title="Ön fizibilite teklif raporunu PDF olarak indirin"
          >
            Teklif PDF'i
          </button>
        )}

        {onAddAlternative && (
          <button
            type="button"
            className={styles.actionBtn}
            onClick={onAddAlternative}
            aria-label="Alternatif Oluştur"
            title="Mevcut taslağı çoğaltarak yeni bir alternatif oluşturun"
          >
            + Alternatif Oluştur
          </button>
        )}

        {onCompareClick && allScenarios.length > 1 && (
          <button
            type="button"
            className={styles.actionBtn}
            onClick={onCompareClick}
            aria-label="Karşılaştır"
          >
            Karşılaştır
          </button>
        )}

        {showHistory && (
          <div className={styles.historyPopover} data-testid="scenario-history-popover">
            <div className={styles.historyPopoverTitle}>Son Değişiklikler</div>
            {historyEntries.length === 0 ? (
              <div className={styles.historyEmpty}>Henüz bir değişiklik yapılmadı.</div>
            ) : (
              historyEntries.slice(0, 15).map((entry) => (
                <div key={entry.id} className={styles.historyItem}>
                  <span>{entry.label}</span>
                  <span className={styles.historyItemTime}>
                    {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
