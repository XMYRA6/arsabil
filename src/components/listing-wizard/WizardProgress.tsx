'use client'

import React from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { sealTransition } from '@/lib/motion'
import styles from './WizardProgress.module.css'

const STEP_LABELS = ['Konum', 'Detay', 'Fotoğraf', 'Fizibilite', 'Yayınla']

interface Props {
  currentStep: number
  /** Yalnızca TAMAMLANMIŞ adımlar için çağrılır (Impeccable critique P2,
      2026-09-17) — güç kullanıcısı art arda "Geri" tıklamak zorunda kalmasın. */
  onStepClick?: (step: number) => void
}

export function WizardProgress({ currentStep, onStepClick }: Props) {
  const reduceMotion = useReducedMotion()

  return (
    <div className={styles.progress}>
      {STEP_LABELS.map((label, i) => {
        const step = i + 1
        const done = step < currentStep
        const active = step === currentStep
        const sealState = done ? 'done' : active ? 'active' : 'idle'
        const clickable = done && !!onStepClick
        const MotionTag = clickable ? motion.button : motion.div
        return (
          <React.Fragment key={step}>
            <div className={styles.node}>
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
