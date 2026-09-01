'use client'

import { useRef, useState } from 'react'
import type { AkifMessage, AkifTurn } from '@/lib/ai/akif/contract'
import { AkifChat, type AkifChatEntry } from '@/components/akif/AkifChat'
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
  const conversationId = useRef(makeId()).current
  const [entries, setEntries] = useState<AkifChatEntry[]>([])
  const [pending, setPending] = useState(false)

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
      <h1 className={styles.title}>Akif Usta&apos;ya Sor</h1>
      <p className={styles.sub}>
        Arsanı, emsali ve müteahhit payını yaz — iki senaryoyu hesaplayıp anlatayım. Sayılar
        deterministik motordan gelir, uydurma yok.
      </p>
      <AkifChat entries={entries} pending={pending} onSend={send} />
    </div>
  )
}
