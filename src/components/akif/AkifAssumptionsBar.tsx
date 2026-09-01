import styles from './AkifAssumptionsBar.module.css'

export interface AkifAssumptionsBarProps {
  assumptions: string[]
  missingFields: string[]
}

export function AkifAssumptionsBar({ assumptions, missingFields }: AkifAssumptionsBarProps) {
  if (assumptions.length === 0 && missingFields.length === 0) return null
  return (
    <div className={styles.bar}>
      {missingFields.length > 0 && (
        <div className={styles.group}>
          <span className={styles.label}>Eksik</span>
          {missingFields.map((f, i) => (
            <span key={i} className={`${styles.chip} ${styles.warn}`}>
              {f}
            </span>
          ))}
        </div>
      )}
      {assumptions.length > 0 && (
        <div className={styles.group}>
          <span className={styles.label}>Varsayım</span>
          {assumptions.map((a, i) => (
            <span key={i} className={styles.chip}>
              {a}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
