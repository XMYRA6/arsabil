import { useEffect, useState } from 'react'
import styles from './wizard.module.css'
import { WizardFormData } from './types'

interface Report {
  id: string
  title: string
  landShareRatio: number
  minApartmentPrice: number
}

interface Props {
  data: WizardFormData
  onChange: (patch: Partial<WizardFormData>) => void
}

export function WizardStep4Feasibility({ data, onChange }: Props) {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/reports')
      .then(r => r.json())
      .then(d => { setReports((Array.isArray(d) ? d : d.reports ?? []).slice(0, 10)); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className={styles.stepContainer}>
      <p className={styles.stepIntro}>
        Kaydedilmiş bir hesaplama raporunu bu ilanla bağla. Marketplace&apos;te fizibilite skoru gösterilir.
      </p>

      {loading ? (
        <p className={styles.stepNote}>Raporlar yükleniyor...</p>
      ) : reports.length === 0 ? (
        <p className={styles.stepNote}>Kaydedilmiş hesaplama yok. Bu adımı atlayabilirsin.</p>
      ) : (
        <div className={styles.reportList} role="radiogroup" aria-label="Bağlanacak rapor">
          {reports.map(r => {
            const secili = data.reportId === r.id
            const sec = () => onChange({ reportId: secili ? '' : r.id })
            return (
              <div
                key={r.id}
                role="radio"
                aria-checked={secili}
                tabIndex={0}
                className={`${styles.reportOption} ${secili ? styles.reportOptionSelected : ''}`}
                onClick={sec}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sec() }
                }}
              >
                <div className={`${styles.radioCircle} ${secili ? styles.radioCircleSelected : ''}`} />
                <div className={styles.reportOptionInfo}>
                  <div className={styles.reportOptionTitle}>{r.title}</div>
                  <div className={styles.reportOptionMeta}>
                    Arsa payı: %{(r.landShareRatio * 100).toFixed(0)} · Min. daire: {r.minApartmentPrice.toLocaleString('tr-TR')} ₺
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <button className={styles.skipBtn} onClick={() => onChange({ reportId: '' })}>
        Bu adımı atla →
      </button>
    </div>
  )
}


