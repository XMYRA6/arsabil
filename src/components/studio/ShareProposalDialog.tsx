import React, { useState, useEffect } from 'react';
import type { StudioProposalViewModel } from '@/lib/studio/proposalViewModel';
import { checkExportReadiness } from '@/lib/studio/exportReadiness';
import { useKeyboardInset } from '@/components/mobile/useKeyboardInset';
import styles from './ShareProposalDialog.module.css';

export interface ShareProposalDialogProps {
  isOpen: boolean;
  onClose: () => void;
  scenarioId: string | null;
  versionNumber: number | null;
  scenarioName: string;
  viewModel: StudioProposalViewModel | null;
}

export function ShareProposalDialog({
  isOpen,
  onClose,
  scenarioId,
  versionNumber,
  scenarioName,
  viewModel,
}: ShareProposalDialogProps) {
  const [expiresInDays, setExpiresInDays] = useState<number | null>(30);
  const [activeToken, setActiveToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Klavye acikken dialog'u klavyenin ustunde tutar (StudioSaveDialog/
  // ParcelVerificationSheet ile ayni desen — bkz. useKeyboardInset.ts).
  const keyboardInset = useKeyboardInset();

  // Modal açıldığında mevcut token'ı sorgula
  useEffect(() => {
    if (!isOpen || !scenarioId || !versionNumber) {
      setActiveToken(null);
      setError(null);
      return;
    }

    let isMounted = true;
    setIsInitialLoading(true);
    fetch(`/api/studio/scenarios/${scenarioId}/versions/${versionNumber}/share`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isMounted) return;
        const active = data?.tokens?.find((t: any) => t.isActive);
        if (active) setActiveToken(active.token);
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsInitialLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, scenarioId, versionNumber]);

  if (!isOpen) return null;

  const readiness = viewModel ? checkExportReadiness(viewModel) : null;
  const isBlocked = readiness?.status === 'blocked';

  const handleCreateToken = async () => {
    if (!scenarioId || !versionNumber) return;
    try {
      setIsSubmitting(true);
      setError(null);
      const res = await fetch(`/api/studio/scenarios/${scenarioId}/versions/${versionNumber}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expiresInDays }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Paylaşım bağlantısı oluşturulamadı.');
      }
      setActiveToken(data.tokenRecord.token);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevokeToken = async () => {
    if (!scenarioId || !versionNumber || !activeToken) return;
    try {
      setIsSubmitting(true);
      setError(null);
      const res = await fetch(`/api/studio/scenarios/${scenarioId}/versions/${versionNumber}/share`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: activeToken }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Paylaşım iptal edilemedi.');
      }
      setActiveToken(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const shareUrl = activeToken
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/studio/share/${activeToken}`
    : '';

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  return (
    <div className={styles.overlay} data-testid="share-proposal-dialog">
      <div
        className={styles.dialog}
        style={{ '--keyboard-inset': `${keyboardInset}px` } as React.CSSProperties}
      >
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>Senaryoyu Güvenle Paylaş</h2>
            <p className={styles.subtitle}>
              {scenarioName} (v{versionNumber})
            </p>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Kapat">
            ✕
          </button>
        </div>

        {error && <div className={styles.errorBox}>{error}</div>}

        {/* Readiness Status Box */}
        {readiness && (
          <div
            className={
              readiness.status === 'ready'
                ? styles.statusReady
                : readiness.status === 'attention'
                ? styles.statusAttention
                : styles.statusBlocked
            }
          >
            <strong>
              {readiness.status === 'ready' && '✓ Paylaşıma Hazır'}
              {readiness.status === 'attention' && '⚠️ Uyarılarla Paylaşılabilir'}
              {readiness.status === 'blocked' && '⛔ Paylaşım Engellendi'}
            </strong>
            {readiness.blockReasons.length > 0 && (
              <ul className={styles.reasonsList}>
                {readiness.blockReasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            )}
            {readiness.attentionReasons.length > 0 && (
              <ul className={styles.reasonsList}>
                {readiness.attentionReasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Privacy Note */}
        <div className={styles.privacyBox}>
          <strong>🔒 Gizlilik Garantisi</strong>
          <p>
            Alıcı yalnızca bu versiyonun ({versionNumber}. versiyon) yerleşim, program ve teklif parametrelerini salt okunur olarak görebilir. Özel notlarınız veya diğer taslaklarınız asla paylaşılmaz.
          </p>
        </div>

        {/* Active Link or Creation Form */}
        {activeToken ? (
          <div className={styles.activeTokenBox}>
            <label className={styles.inputLabel}>Aktif Paylaşım Bağlantısı</label>
            <div className={styles.linkInputGroup}>
              <input type="text" readOnly value={shareUrl} className={styles.linkInput} />
              <button type="button" className={styles.copyBtn} onClick={handleCopy}>
                {copied ? '✓ Kopyalandı' : 'Kopyala'}
              </button>
            </div>

            <div className={styles.tokenActions}>
              <a href={shareUrl} target="_blank" rel="noopener noreferrer" className={styles.previewLink}>
                Bağlantıyı Aç ↗
              </a>
              <button
                type="button"
                className={styles.revokeBtn}
                onClick={handleRevokeToken}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'İptal ediliyor...' : 'Paylaşımı İptal Et (Revoke)'}
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.createBox}>
            <label className={styles.inputLabel}>Geçerlilik Süresi</label>
            <div className={styles.expiryOptions}>
              <button
                type="button"
                className={expiresInDays === 7 ? styles.optionActive : styles.optionBtn}
                onClick={() => setExpiresInDays(7)}
              >
                7 Gün
              </button>
              <button
                type="button"
                className={expiresInDays === 30 ? styles.optionActive : styles.optionBtn}
                onClick={() => setExpiresInDays(30)}
              >
                30 Gün
              </button>
              <button
                type="button"
                className={expiresInDays === null ? styles.optionActive : styles.optionBtn}
                onClick={() => setExpiresInDays(null)}
              >
                Süresiz
              </button>
            </div>

            <button
              type="button"
              className={styles.createButton}
              onClick={handleCreateToken}
              disabled={isSubmitting || isInitialLoading || isBlocked}
            >
              {isSubmitting ? '⏳ Oluşturuluyor...' : '🔗 Paylaşım Bağlantısı Oluştur'}
            </button>
          </div>
        )}

        <div className={styles.footer}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
