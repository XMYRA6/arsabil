"use client";

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { sealTransition } from '@/lib/motion';
import styles from './page.module.css';

export interface SealBadgeProps {
  show: boolean;
  percentage: number;
  variant: 'cheaper' | 'pricier';
}

/** "Canlı Mühür" — piyasa karşılaştırması eşiği geçildiği andaki tek seferlik damga animasyonu. */
export function SealBadge({ show, percentage, variant }: SealBadgeProps) {
  const shouldReduceMotion = useReducedMotion();
  const badgeClassName = variant === 'pricier'
    ? `${styles.topResultBadge} ${styles.topResultBadgePricier}`
    : styles.topResultBadge;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className={badgeClassName}
          initial={shouldReduceMotion ? false : { scale: 1.4, rotate: -6, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={sealTransition}
        >
          {variant === 'cheaper' ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="9" />
              <path d="M8 12.5l2.5 2.5L16 9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v5M12 16h.01" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          Piyasaya Göre: %{percentage} {variant === 'cheaper' ? 'DAHA UCUZ' : 'DAHA PAHALI'}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
