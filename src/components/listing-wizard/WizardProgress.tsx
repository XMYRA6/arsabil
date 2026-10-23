'use client'

import React from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { sealTransition } from '@/lib/motion'
import styles from './WizardProgress.module.css'

// Figma 07 (İlan oluştur): tam adım adları, yatay hap adımlar.
const STEP_LABELS = ['Konum bilgisi', 'Arsa detayları', 'Fotoğraflar', 'Fizibilite bağla', 'Önizle & yayınla']

interface Props {
  currentStep: number
  /** Yalnızca TAMAMLANMIŞ adımlar için çağrılır (Impeccable critique P2,
      2026-09-17) — güç kullanıcısı art arda "Geri" tıklamak zorunda kalmasın. */
  onStepClick?: (step: number) => void
}

export function WizardProgress({ currentStep, onStepClick }: Props) {
  const reduceMotion = useReducedMotion()

  return (
    <ol className={styles.progress} aria-label="Adımlar">
      {STEP_LABELS.map((label, i) => {
        const step = i + 1
        const done = step < currentStep
        const active = step === currentStep
        const sealState = done ? 'done' : active ? 'active' : 'idle'
        const clickable = done && !!onStepClick
        const MotionTag = clickable ? motion.button : motion.div
        return (
          <li key={step} className={`${styles.node} ${active ? styles.nodeActive : ''}`} aria-current={active ? 'step' : undefined}>
            <MotionTag
              {...(clickable
                ? { type: 'button' as const, 'aria-label': `${label} adımına dön`, onClick: () => onStepClick!(step) }
                : {})}
              data-seal-state={sealState}
              className={`${styles.circle} ${active ? styles.circleActive : ''} ${done ? styles.circleDone : ''} ${clickable ? styles.circleClickable : ''}`}
              animate={sealState}
              variants={{
                idle: { scale: 1 },
                active: { scale: 1 },
                done: reduceMotion ? { scale: 1 } : { scale: 1.12 },
              }}
              transition={sealTransition}
            >
              {done ? '✓' : step}
            </MotionTag>
            <span className={`${styles.label} ${active ? styles.labelActive : ''} ${done ? styles.labelDone : ''}`}>
              {label}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
