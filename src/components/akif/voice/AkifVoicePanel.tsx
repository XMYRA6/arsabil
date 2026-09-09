'use client'

import { useRealtimeVoice } from './useRealtimeVoice'
import { AkifVoiceTranscript } from './AkifVoiceTranscript'
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

  return (
    <div className={styles.panel}>
      <div className={styles.transcript}>
        <AkifVoiceTranscript items={v.transcript} />
      </div>

      {v.errorText && <p className={styles.error}>{v.errorText}</p>}

      <div className={styles.controls}>
        {v.status === 'idle' && (
          <button type="button" className={styles.start} onClick={() => void v.start()}>
            🎙 Konuşmaya başla
          </button>
        )}
        {v.status === 'connecting' && <span className={styles.hint}>Bağlanıyor…</span>}
        {(v.status === 'listening' || v.status === 'speaking') && (
          <>
            <span className={`${styles.orb} ${styles[v.status]}`} aria-hidden />
            <span className={styles.timer}>{fmt(v.elapsedSec)}</span>
            <button type="button" className={styles.stop} onClick={() => v.stop('user_ended')}>
              Bitir
            </button>
          </>
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
