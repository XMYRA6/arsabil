"use client";

import { motion, useReducedMotion } from 'framer-motion';
import { FizibiliteScoreBadge } from '@/components/marketplace/FizibiliteScoreBadge';

interface Props {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

/** "Canlı Mühür" — ilan detayında skor rozeti ilk göründüğünde tek seferlik damga-oturma animasyonu. */
export function ScoreRevealBadge({ score, size, showLabel }: Props) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { scale: 1.4, rotate: -6, opacity: 0 }}
      animate={{ scale: 1, rotate: 0, opacity: 1 }}
      transition={{ type: 'spring', duration: 0.18 }}
    >
      <FizibiliteScoreBadge score={score} size={size} showLabel={showLabel} />
    </motion.div>
  );
}
