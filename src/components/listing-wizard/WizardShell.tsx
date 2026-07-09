import React from 'react'
import styles from './WizardShell.module.css'
import { WizardProgress } from './WizardProgress'
import { AppBar } from '@/components/mobile/AppBar'
import { StickyActionBar } from '@/components/mobile/StickyActionBar'

interface WizardShellProps {
  pageTitle: string
  stepTitle: string
  step: number
  onBack?: () => void
  onNext?: () => void
  nextDisabled?: boolean
  children: React.ReactNode
}

export function WizardShell({ pageTitle, stepTitle, step, onBack, onNext, nextDisabled, children }: WizardShellProps) {
  return (
    <div className={styles.container}>
      <h1 className={styles.pageTitle}>{pageTitle}</h1>
      <AppBar title={stepTitle} showBack={!!onBack} onBack={onBack} />

      <div className={styles.card}>
        <WizardProgress currentStep={step} />
        <h2 className={styles.stepTitle}>{stepTitle}</h2>

        {children}

        {onNext && (
          <div className={styles.nav}>
            {onBack
              ? <button className={styles.backBtn} onClick={onBack}>← Geri</button>
              : <div />
            }
            <button className={styles.nextBtn} onClick={onNext} disabled={nextDisabled}>
              İleri →
            </button>
          </div>
        )}

        {!onNext && onBack && (
          <div className={styles.nav}>
            <button className={styles.backBtn} onClick={onBack}>← Geri</button>
            <div />
          </div>
        )}
      </div>

      <StickyActionBar aboveBottomNav>
        {onBack && <button className={styles.stickyBackBtn} onClick={onBack}>← Geri</button>}
        {onNext && <button className={styles.stickyNextBtn} onClick={onNext} disabled={nextDisabled}>İleri →</button>}
      </StickyActionBar>
    </div>
  )
}
