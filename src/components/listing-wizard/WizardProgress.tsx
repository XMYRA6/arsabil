import React from 'react'
import styles from './WizardProgress.module.css'

const STEP_LABELS = ['Konum', 'Detay', 'Fotoğraf', 'Fizibilite', 'Yayınla']

interface Props {
  currentStep: number
}

export function WizardProgress({ currentStep }: Props) {
  return (
    <div className={styles.progress}>
      {STEP_LABELS.map((label, i) => {
        const step = i + 1
        const done = step < currentStep
        const active = step === currentStep
        return (
          <React.Fragment key={step}>
            <div className={styles.node}>
              <div className={`${styles.circle} ${active ? styles.circleActive : ''} ${done ? styles.circleDone : ''}`}>
                {done ? '✓' : step}
              </div>
              <span className={`${styles.label} ${active ? styles.labelActive : ''} ${done ? styles.labelDone : ''}`}>
                {label}
              </span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div className={`${styles.connector} ${done ? styles.connectorDone : ''} ${active ? styles.connectorActive : ''}`} />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}
