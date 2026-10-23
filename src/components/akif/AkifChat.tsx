'use client'

import { useEffect, useRef, useState } from 'react'
import type { AkifTurn, ScenarioCard } from '@/lib/ai/akif/contract'
import { useKeyboardInset } from '@/components/mobile/useKeyboardInset'
import { AkifMessageBubble } from './AkifMessageBubble'
import { AkifAssumptionsBar } from './AkifAssumptionsBar'
import { AkifScenarioCard } from './AkifScenarioCard'
import styles from './AkifChat.module.css'

export type AkifChatEntry =
  | { id: string; role: 'user'; content: string }
  | { id: string; role: 'akif'; turn: AkifTurn }
  | { id: string; role: 'error'; content: string }

export interface AkifChatProps {
  entries: AkifChatEntry[]
  pending: boolean
  onSend: (text: string) => void
  /** Verilirse besteciye mikrofon düğmesi eklenir (sesli moda geçiş). */
  onVoice?: () => void
}

const EXAMPLES = ['900 m² arsa, emsal 1.5, müteahhit %50', 'emsal nedir?']

export function AkifChat({ entries, pending, onSend, onVoice }: AkifChatProps) {
  const [draft, setDraft] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  // Mobil sanal klavye açılınca `100dvh` küçülmez; besteci klavyenin altında
  // kalırdı. `useKeyboardInset` (BottomSheet ile aynı) pozitif inset döndürür,
  // `.wrap` yüksekliğinden düşülür → besteci klavyenin üstüne çıkar.
  const keyboardInset = useKeyboardInset()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [entries.length, pending, keyboardInset])

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault()
    const t = draft.trim()
    if (!t || pending) return
    onSend(t)
    setDraft('')
  }

  return (
    <div
      className={styles.wrap}
      style={{ '--keyboard-inset': `${keyboardInset}px` } as React.CSSProperties}
    >
      <div className={styles.transcript}>
        {entries.length === 0 && (
          <div className={styles.intro}>
            <p>
              Merhaba, ben Akif Usta. Arsanın alanını, emsali ve müteahhit payını yaz; iki
              senaryoyu hesaplayıp anlatayım.
            </p>
          </div>
        )}

        {entries.map((entry) => {
          if (entry.role === 'user') {
            return <AkifMessageBubble key={entry.id} role="user" content={entry.content} />
          }
          if (entry.role === 'error') {
            return (
              <p key={entry.id} className={styles.error}>
                {entry.content}
              </p>
            )
          }
          const { turn } = entry
          const tr = turn.tool_result
          return (
            <div key={entry.id}>
              <AkifMessageBubble role="akif" content={turn.speech} />
              <AkifAssumptionsBar assumptions={turn.assumptions} missingFields={turn.missing_fields} />
              {tr?.kind === 'term' && (
                <div className={styles.term}>
                  <strong>{tr.term}</strong> — {tr.shortDef}
                  <div className={styles.termEx}>Örnek: {tr.example}</div>
                </div>
              )}
              {tr && tr.kind !== 'term' && <AkifScenarioCard card={tr as ScenarioCard} />}
              {turn.needs_confirmation && (
                <div className={styles.confirm}>
                  <span>{turn.needs_confirmation.question}</span>
                  <div className={styles.confirmBtns}>
                    <button type="button" onClick={() => onSend('Evet')}>
                      Evet
                    </button>
                    <button type="button" onClick={() => onSend('Hayır')}>
                      Hayır
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {pending && <p className={styles.thinking}>Akif düşünüyor…</p>}
        <div ref={bottomRef} />
      </div>

      <form className={styles.composer} onSubmit={submit}>
        <textarea
          className={styles.input}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) submit()
          }}
          placeholder="Arsanı ve payı yaz…"
          rows={1}
          disabled={pending}
        />
        {onVoice && (
          <button type="button" className={styles.mic} onClick={onVoice} aria-label="Sesli giriş">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="9" y="3" width="6" height="11" rx="3" />
              <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
            </svg>
          </button>
        )}
        <button type="submit" className={styles.send} disabled={pending} aria-label="Gönder">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 3 10 14M21 3l-7 18-4-7-7-4z" />
          </svg>
        </button>
      </form>
      <div className={styles.hints}>
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  className={styles.example}
                  onClick={() => onSend(ex)}
                >
                  {ex}
                </button>
              ))}
      </div>
    </div>
  )
}
