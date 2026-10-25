import type { Recommendation } from '@/lib/ai/akif/contract'
import styles from './AkifRecommendation.module.css'

export interface AkifRecommendationProps {
  recommendation: Recommendation
  rowLabel: string
}

export function AkifRecommendation({ recommendation, rowLabel }: AkifRecommendationProps) {
  return (
    <div className={styles.box}>
      <div className={styles.title}>Akif&apos;in önerisi</div>
      <p className={styles.row}>{rowLabel}</p>
      <p className={styles.reason}>{recommendation.reason}</p>
      <p className={styles.criterion}>Ölçüt: {recommendation.criterion}</p>
    </div>
  )
}
