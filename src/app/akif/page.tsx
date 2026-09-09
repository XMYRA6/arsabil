'use client'

import { useState } from 'react'
import type { AkifMessage, AkifTurn } from '@/lib/ai/akif/contract'
import { AkifChat, type AkifChatEntry } from '@/components/akif/AkifChat'
import { AkifVoicePanel } from '@/components/akif/voice/AkifVoicePanel'
import styles from './page.module.css'

const makeId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `c_${Date.now()}_${Math.random().toString(36).slice(2)}`

const ERR: Record<number, string> = {
  429: 'Çok sık soru sordun, biraz bekle.',
  503: 'Akif şu an kapalı (yapılandırma eksik).',
  502: 'Akif şu an yanıt veremiyor, birazdan dene.',
}

function toHistory(entries: AkifChatEntry[]): AkifMessage[] {
  const msgs: AkifMessage[] = []
  for (const e of entries) {
    if (e.role === 'user') msgs.push({ role: 'user', content: e.content })
    else if (e.role === 'akif') msgs.push({ role: 'akif', content: e.turn.speech })
  }
  return msgs.slice(-40)
}

export default function AkifPage() {
  // Sohbet kimliği state'te — "Yeni sohbet" sıfırlamada yenilenir.
  const [conversationId, setConversationId] = useState(makeId)
  const [entries, setEntries] = useState<AkifChatEntry[]>([])
  const [pending, setPending] = useState(false)
  const [mode, setMode] = useState<'text' | 'voice'>('text')

  const resetConversation = () => {
    if (pending) return
    setEntries([])
    setConversationId(makeId())
  }

  const send = async (text: string) => {
    if (pending) return
    const history = toHistory(entries)
    setEntries((prev) => [...prev, { id: makeId(), role: 'user', content: text }])
    setPending(true)
    try {
      const res = await fetch('/api/akif/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, history, userMessage: text }),
      })
      if (!res.ok) {
        setEntries((prev) => [
          ...prev,
          {
            id: makeId(),
            role: 'error',
            content: ERR[res.status] ?? 'Bir sorun oldu, tekrar dener misin?',
          },
        ])
        return
      }
      const turn = (await res.json()) as AkifTurn
      setEntries((prev) => [...prev, { id: makeId(), role: 'akif', turn }])
    } catch {
      setEntries((prev) => [
        ...prev,
        { id: makeId(), role: 'error', content: 'Bağlantı hatası, tekrar deneyin.' },
      ])
    } finally {
      setPending(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <h1 className={styles.title}>Akif Usta&apos;ya Sor</h1>
        <div className={styles.headActions}>
          {mode === 'text' && (
            <button
              type="button"
              className={styles.voiceToggle}
              onClick={() => setMode('voice')}
            >
              🎙 Sesli konuş
            </button>
          )}
          {mode === 'text' && entries.length > 0 && (
            <button
              type="button"
              className={styles.reset}
              onClick={resetConversation}
              disabled={pending}
            >
              Yeni sohbet
            </button>
          )}
        </div>
      </div>
      <p className={styles.sub}>
        Arsanı, emsali ve müteahhit payını {mode === 'voice' ? 'söyle' : 'yaz'} — iki senaryoyu
        hesaplayıp anlatayım. Sayılar deterministik motordan gelir, uydurma yok.
      </p>
      {mode === 'text' ? (
        <AkifChat entries={entries} pending={pending} onSend={send} />
      ) : (
        <AkifVoicePanel onExit={() => setMode('text')} />
      )}
    </div>
  )
}
