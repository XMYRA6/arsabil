"use client";

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import styles from './page.module.css';

export interface SealBadgeProps {
  show: boolean;
  percentage: number;
}

/** "Canlı Mühür" — piyasaya göre daha ucuz olduğu andaki tek seferlik damga animasyonu. */
export function SealBadge({ show, percentage }: SealBadgeProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className={styles.topResultBadge}
          initial={shouldReduceMotion ? false : { scale: 1.4, rotate: -6, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: 'spring', duration: 0.18 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="9" />
            <path d="M8 12.5l2.5 2.5L16 9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Piyasaya Göre: %{percentage} DAHA UCUZ
        </motion.div>
      )}
    </AnimatePresence>
  );
}
