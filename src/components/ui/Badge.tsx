import React, { ReactNode } from 'react'
import styles from './Badge.module.css'

export interface BadgeProps {
  tone?: 'neutral' | 'ok' | 'bad' | 'amber' | 'blue'
  children: ReactNode
  className?: string
}

export function Badge({ tone = 'neutral', children, className }: BadgeProps) {
  const toneClass = styles[tone] || styles.neutral
  return (
    <span className={[styles.badge, toneClass, className].filter(Boolean).join(' ')}>
      {children}
    </span>
  )
}
