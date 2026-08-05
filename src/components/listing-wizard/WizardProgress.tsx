'use client'

import React from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import styles from './WizardProgress.module.css'

const STEP_LABELS = ['Konum', 'Detay', 'Fotoğraf', 'Fizibilite', 'Yayınla']

interface Props {
  currentStep: number
}

export function WizardProgress({ currentStep }: Props) {
  const reduceMotion = useReducedMotion()

  return (
    <div className={styles.progress}>
      {STEP_LABELS.map((label, i) => {
        const step = i + 1
        const done = step < currentStep
        const active = step === currentStep
        const sealState = done ? 'done' : active ? 'active' : 'idle'
        return (
          <React.Fragment key={step}>
            <div className={styles.node}>
              <motion.div
                data-seal-state={sealState}
                className={`${styles.circle} ${active ? styles.circleActive : ''} ${done ? styles.circleDone : ''}`}
                animate={sealState}
                variants={{
                  idle: { scale: 1 },
                  active: { scale: 1 },
                  done: reduceMotion ? { scale: 1 } : { scale: [1.35, 0.94, 1] },
                }}
                transition={{ duration: reduceMotion ? 0 : 0.18, ease: 'easeOut' }}
              >
                {done ? '✓' : step}
              </motion.div>
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
