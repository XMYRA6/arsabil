'use client'

import { useRealtimeVoice } from './useRealtimeVoice'
import { AkifVoiceTranscript } from './AkifVoiceTranscript'
import { AkifActionConfirmCard } from './AkifActionConfirmCard'
import styles from './AkifVoicePanel.module.css'

function fmt(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function AkifVoicePanel({ onExit }: { onExit: () => void }) {
  const v = useRealtimeVoice()

  const exit = () => {
    v.stop('user_ended')
    onExit()
  }

  const active = v.status === 'listening' || v.status === 'speaking'

  return (
    <div className={styles.panel}>
      {active && (
        <>
          <h2 className={styles.status}>{v.status === 'listening' ? 'Dinliyorum…' : 'Akif konuşuyor…'}</h2>
          <p className={styles.statusSub}>Arsanı, emsali ve payı söyle.</p>
        </>
      )}

      {v.status !== 'reconnecting' && active && (
        <div className={styles.orbWrap}>
          <span className={`${styles.orb} ${styles[v.status]}`} aria-hidden>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="3" width="6" height="11" rx="3" />
              <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
            </svg>
          </span>
          <span className={styles.timer}>{fmt(v.elapsedSec)}</span>
        </div>
      )}

      <div className={styles.transcript}>
        <AkifVoiceTranscript items={v.transcript} />
      </div>

      {v.errorText && <p className={styles.error}>{v.errorText}</p>}

      {v.pendingAction && (
        <AkifActionConfirmCard
          key={v.pendingAction.pendingActionId ?? v.pendingAction.phase}
          pending={v.pendingAction}
          onConfirm={v.confirmPendingAction}
          onCancel={v.cancelPendingAction}
          onUndo={v.undoLastAction}
        />
      )}

      <div className={styles.controls}>
        {v.status === 'idle' && (
          <button type="button" className={styles.start} onClick={() => void v.start()}>
            Konuşmaya başla
          </button>
        )}
        {v.status === 'connecting' && <span className={styles.hint}>Bağlanıyor…</span>}
        {v.status === 'reconnecting' && (
          <span className={styles.hint}>Bağlantı yeniden kuruluyor…</span>
        )}
        {(active || v.status === 'reconnecting') && (
          <button type="button" className={styles.stop} onClick={() => v.stop('user_ended')}>
            Bitir
          </button>
        )}
        {v.status === 'error' && (
          <button type="button" className={styles.start} onClick={() => void v.start()}>
            Tekrar dene
          </button>
        )}
        <button type="button" className={styles.exit} onClick={exit}>
          Metne dön
        </button>
      </div>
    </div>
  )
}
