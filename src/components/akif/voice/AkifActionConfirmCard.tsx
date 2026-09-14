'use client'

import { useState } from 'react'
import type { PendingAction, PendingActionOverrides } from './useRealtimeVoice'
import styles from './AkifActionConfirmCard.module.css'

// prepareScenarioSave.ts'deki ProjectRef/ScenarioDisplay ile aynı şekil —
// hook'ta confirmCard `unknown` (server payload'ı doğrulanmadan geçiyor), burada
// yalnız render amaçlı yerel bir görünüm tipi olarak yeniden beyan edilir.
type ProjectRef = { existingId: string } | { newName: string | null }

interface ScenarioDisplay {
  arsaPayiPct: number
  sahibineDaire: number | null
  sahibineTL: number | null
  toplamMaliyet: number
  satisFiyati: number
}

interface ConfirmCard {
  projectRef: ProjectRef
  scenarioName: string
  display: ScenarioDisplay
}

export interface AkifActionConfirmCardProps {
  pending: PendingAction
  onConfirm: (overrides: PendingActionOverrides) => void
  onCancel: () => void
  onUndo: () => void
}

const fmt = (n: number | null): string => (n === null ? '—' : n.toLocaleString('tr-TR'))

function factsText(d: ScenarioDisplay): string {
  return `Arsa payı %${fmt(d.arsaPayiPct)} · Sahibine ${fmt(d.sahibineDaire)} daire · ${fmt(d.sahibineTL)} ₺ · Toplam maliyet ${fmt(d.toplamMaliyet)} ₺ · Satış ${fmt(d.satisFiyati)} ₺`
}

export function AkifActionConfirmCard({ pending, onConfirm, onCancel, onUndo }: AkifActionConfirmCardProps) {
  const confirmCard = pending.confirmCard as ConfirmCard | undefined
  const candidates = pending.candidates ?? []
  const hasCandidates = pending.phase === 'proposal' && candidates.length > 0
  const needsNewProjectName =
    pending.phase === 'proposal' &&
    !hasCandidates &&
    !!confirmCard &&
    'newName' in confirmCard.projectRef

  const [scenarioName, setScenarioName] = useState(confirmCard?.scenarioName ?? '')
  const [projectName, setProjectName] = useState(() =>
    confirmCard && 'newName' in confirmCard.projectRef ? confirmCard.projectRef.newName ?? '' : '',
  )
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null)

  if (pending.phase === 'saving') {
    return (
      <div className={styles.card}>
        <p className={styles.hint}>Kaydediliyor…</p>
      </div>
    )
  }

  if (pending.phase === 'saved') {
    const saved = pending.saved
    const undoExpired = !saved || new Date(saved.undoUntil).getTime() <= Date.now()
    return (
      <div className={styles.card}>
        <p className={styles.savedText}>{saved?.projectName} projesine kaydedildi.</p>
        <div className={styles.actions}>
          <button type="button" className={styles.secondary} onClick={onUndo} disabled={undoExpired}>
            Geri Al
          </button>
        </div>
      </div>
    )
  }

  if (pending.phase === 'error') {
    return (
      <div className={styles.card}>
        <p className={styles.errorText}>{pending.errorMessage}</p>
        <div className={styles.actions}>
          <button type="button" className={styles.secondary} onClick={onCancel}>
            Kapat
          </button>
        </div>
      </div>
    )
  }

  // phase === 'proposal'
  if (!confirmCard) return null

  const canSubmit = hasCandidates
    ? !!selectedCandidateId
    : !needsNewProjectName || projectName.trim() !== ''

  const handleConfirm = () => {
    if (!canSubmit) return
    const overrides: PendingActionOverrides = {
      scenarioName: scenarioName.trim() || confirmCard.scenarioName,
    }
    if (hasCandidates && selectedCandidateId) {
      overrides.projectId = selectedCandidateId
    } else if (needsNewProjectName) {
      overrides.projectName = projectName.trim()
    }
    onConfirm(overrides)
  }

  return (
    <div className={styles.card}>
      <p className={styles.facts}>{factsText(confirmCard.display)}</p>

      <label className={styles.label}>
        Senaryo adı
        <input
          className={styles.input}
          value={scenarioName}
          onChange={(e) => setScenarioName(e.target.value)}
        />
      </label>

      {hasCandidates && (
        <div className={styles.candidates} role="radiogroup" aria-label="Proje seç">
          {candidates.map((c) => (
            <label key={c.id} className={styles.candidateOption}>
              <input
                type="radio"
                name="akif-project-candidate"
                checked={selectedCandidateId === c.id}
                onChange={() => setSelectedCandidateId(c.id)}
              />
              {c.name}
            </label>
          ))}
        </div>
      )}

      {needsNewProjectName && (
        <label className={styles.label}>
          Proje adı
          <input
            className={styles.input}
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="Yeni proje adı"
          />
        </label>
      )}

      <div className={styles.actions}>
        <button type="button" className={styles.primary} onClick={handleConfirm} disabled={!canSubmit}>
          Kaydet
        </button>
        <button type="button" className={styles.secondary} onClick={onCancel}>
          Vazgeç
        </button>
      </div>
    </div>
  )
}
