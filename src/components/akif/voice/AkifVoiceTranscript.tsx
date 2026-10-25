'use client'

import type { ParcelCompareCard, ScenarioCard } from '@/lib/ai/akif/contract'
import { AkifMessageBubble } from '../AkifMessageBubble'
import { AkifParcelCompareCard } from '../AkifParcelCompareCard'
import { AkifScenarioCard } from '../AkifScenarioCard'
import type { VoiceTranscriptItem } from './useRealtimeVoice'
import styles from './AkifVoiceTranscript.module.css'

export function AkifVoiceTranscript({ items }: { items: VoiceTranscriptItem[] }) {
  return (
    <div className={styles.wrap}>
      {items.map((it) => {
        if (it.card) {
          if (it.card.kind === 'term') {
            return (
              <div key={it.id} className={styles.term}>
                <strong>{it.card.term}</strong> — {it.card.shortDef}
                <div className={styles.termEx}>Örnek: {it.card.example}</div>
              </div>
            )
          }
          if (it.card.kind === 'parcel_compare') {
            return <AkifParcelCompareCard key={it.id} card={it.card as ParcelCompareCard} />
          }
          return <AkifScenarioCard key={it.id} card={it.card as ScenarioCard} />
        }
        if (!it.text) return null
        return (
          <AkifMessageBubble
            key={it.id}
            role={it.role === 'user' ? 'user' : 'akif'}
            content={it.text}
          />
        )
      })}
    </div>
  )
}
