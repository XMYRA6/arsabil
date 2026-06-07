import React from 'react'

const STEP_LABELS = ['Konum', 'Detay', 'Fotoğraf', 'Fizibilite', 'Yayınla']

interface Props {
  currentStep: number
}

export function WizardProgress({ currentStep }: Props) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem' }}>
      {STEP_LABELS.map((label, i) => {
        const step = i + 1
        const done   = step < currentStep
        const active = step === currentStep
        return (
          <React.Fragment key={step}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                background: done || active ? 'var(--primary)' : 'var(--panel)',
                border: `2px solid ${done || active ? 'var(--primary)' : 'var(--border)'}`,
                color: done || active ? 'white' : 'var(--muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.8rem', fontWeight: 800,
              }}>
                {done ? '✓' : step}
              </div>
              <span style={{
                fontSize: '0.6rem', whiteSpace: 'nowrap',
                fontWeight: active ? 800 : 600,
                color: active ? 'var(--primary)' : done ? 'var(--text)' : 'var(--muted)',
              }}>
                {label}
              </span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div style={{
                height: 2, flex: 1, marginBottom: 20,
                background: done ? 'var(--primary)' : 'var(--border)',
              }} />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}
