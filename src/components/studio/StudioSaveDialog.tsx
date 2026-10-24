"use client";

import React, { useState, useTransition } from 'react';
import { useKeyboardInset } from '@/components/mobile/useKeyboardInset';
import styles from './StudioSaveDialog.module.css';
import type { StudioSnapshotDraft } from '@/lib/studio/types';
import { extractSnapshotSummary } from '@/lib/studio/snapshotVersioning';
import type {
  StudioScenarioRecord,
  StudioScenarioVersionRecord,
} from '@/lib/studio/persistenceTypes';

export type StudioSaveDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  currentSnapshot: StudioSnapshotDraft;
  scenarioName: string;
  savedScenarioId?: string | null;
  savedScenarioVersionNumber?: number | null;
  onSaveSuccess: (scenario: StudioScenarioRecord, version: StudioScenarioVersionRecord) => void;
};

export function StudioSaveDialog({
  isOpen,
  onClose,
  currentSnapshot,
  scenarioName,
  savedScenarioId,
  savedScenarioVersionNumber,
  onSaveSuccess,
}: StudioSaveDialogProps) {
  const [mode, setMode] = useState<'new_version' | 'new_scenario'>(
    savedScenarioId ? 'new_version' : 'new_scenario'
  );
  const [name, setName] = useState(scenarioName);
  const [summaryNotes, setSummaryNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  // Klavye acikken modal'i klavyenin ustunde tutar (ParcelVerificationSheet'te
  // dogrulanan ayni desen — bkz. useKeyboardInset.ts) — kullanici bulgusu:
  // "Senaryo Basligi"/"Versiyon Notu" alanlarina dokunulunca klavye modal'in
  // alt kismini/formu kapatiyordu.
  const keyboardInset = useKeyboardInset();

  if (!isOpen) return null;

  const summary = extractSnapshotSummary(currentSnapshot);
  const isVerified = summary.parcelSourceStatus === 'verified_tkgm';
  const parcelLoc = summary.parcelIdentity
    ? `${summary.parcelIdentity.il || ''} ${summary.parcelIdentity.ilce || ''} ${summary.parcelIdentity.adaNo ? `Ada ${summary.parcelIdentity.adaNo}` : ''} ${summary.parcelIdentity.parselNo ? `Parsel ${summary.parcelIdentity.parselNo}` : ''}`.trim()
    : 'Parsel konumu belirtilmedi';

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    startTransition(async () => {
      try {
        if (mode === 'new_scenario' || !savedScenarioId) {
          if (!name.trim()) {
            setErrorMessage('Senaryo adı boş olamaz.');
            return;
          }

          const res = await fetch('/api/studio/scenarios', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: name.trim(),
              snapshot: currentSnapshot,
              summaryNotes: summaryNotes.trim() || undefined,
            }),
          });

          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.message || 'Senaryo kaydedilemedi.');
          }

          onSaveSuccess(data.scenario, data.version);
          onClose();
        } else {
          // New version for existing scenario
          const expectedVersion = savedScenarioVersionNumber || 1;
          const res = await fetch(`/api/studio/scenarios/${savedScenarioId}/versions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              expectedVersionNumber: expectedVersion,
              snapshot: currentSnapshot,
              summaryNotes: summaryNotes.trim() || undefined,
            }),
          });

          const data = await res.json();
          if (!res.ok) {
            if (res.status === 409) {
              throw new Error('Senaryo başka bir sekmede/cihazda güncellenmiş. Lütfen sayfayı yenileyip tekrar dene.');
            }
            throw new Error(data.message || 'Yeni versiyon kaydedilemedi.');
          }

          onSaveSuccess(data.scenario, data.version);
          onClose();
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'Kayıt sırasında bir hata oluştu.');
      }
    });
  };

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true" data-testid="studio-save-dialog">
      <div
        className={styles.modal}
        style={{ '--keyboard-inset': `${keyboardInset}px` } as React.CSSProperties}
      >
        <div className={styles.header}>
          <h3 className={styles.title}>Senaryoyu Buluta Kaydet</h3>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            disabled={isPending}
            aria-label="Kapat"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSave}>
          <div className={styles.body}>
            {/* Ozet karti */}
            <div className={styles.summaryCard}>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Parsel Bilgisi:</span>
                <span className={styles.summaryValue}>{parcelLoc}</span>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Veri Kaynağı:</span>
                <span
                  className={`${styles.sourceBadge} ${
                    isVerified ? styles.sourceVerified : styles.sourceDemo
                  }`}
                >
                  {isVerified ? 'TKGM Doğrulanmış' : 'Demo / Varsayım'}
                </span>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Brüt İnşaat / Tahsis:</span>
                <span className={styles.summaryValue}>
                  {summary.grossConstructionAreaM2} m² / {summary.totalAllocatedAreaM2} m²
                </span>
              </div>
            </div>

            {summary.needsRebalance && (
              <div className={styles.warningAlert}>
                ⚠️ Bu senaryoda teklif dengesi uyarısı mevcut. Kaydedilen versiyonda bu durum korunacaktır.
              </div>
            )}

            {savedScenarioId && (
              <div className={styles.modeSwitch}>
                <button
                  type="button"
                  className={`${styles.modeButton} ${
                    mode === 'new_version' ? styles.modeButtonActive : ''
                  }`}
                  onClick={() => setMode('new_version')}
                >
                  Yeni Versiyon (v{(savedScenarioVersionNumber || 1) + 1})
                </button>
                <button
                  type="button"
                  className={`${styles.modeButton} ${
                    mode === 'new_scenario' ? styles.modeButtonActive : ''
                  }`}
                  onClick={() => setMode('new_scenario')}
                >
                  Farklı Senaryo Olarak Kaydet
                </button>
              </div>
            )}

            {mode === 'new_scenario' && (
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="studio-scenario-name-input">
                  Senaryo Başlığı
                </label>
                <input
                  id="studio-scenario-name-input"
                  className={styles.input}
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Örn: 2 Bloklu Konut + Dükkan Taslağı"
                  required
                  maxLength={120}
                  disabled={isPending}
                />
              </div>
            )}

            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="studio-scenario-notes-input">
                Versiyon Notu (Opsiyonel)
              </label>
              <textarea
                id="studio-scenario-notes-input"
                className={styles.textarea}
                rows={2}
                value={summaryNotes}
                onChange={(e) => setSummaryNotes(e.target.value)}
                placeholder="Örn: Zemin ticari cephe eklendi, bina çekme mesafesi 3m yapıldı"
                disabled={isPending}
              />
            </div>

            {errorMessage && (
              <div className={styles.errorText} role="alert">
                {errorMessage}
              </div>
            )}
          </div>

          <div className={styles.footer}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={onClose}
              disabled={isPending}
            >
              İptal
            </button>
            <button
              type="submit"
              className={styles.saveBtn}
              disabled={isPending}
            >
              {isPending ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
