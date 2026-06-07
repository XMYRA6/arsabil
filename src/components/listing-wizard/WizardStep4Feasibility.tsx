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
      <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
        Kaydedilmiş bir hesaplama raporunu bu ilanla bağla. Marketplace&apos;te fizibilite skoru gösterilir.
      </p>

      {loading ? (
        <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Raporlar yükleniyor...</p>
      ) : reports.length === 0 ? (
        <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Kaydedilmiş hesaplama yok. Bu adımı atlayabilirsin.</p>
      ) : (
        <div className={styles.reportList}>
          {reports.map(r => (
            <div
              key={r.id}
              className={`${styles.reportOption} ${data.reportId === r.id ? styles.reportOptionSelected : ''}`}
              onClick={() => onChange({ reportId: data.reportId === r.id ? '' : r.id })}
            >
              <div className={`${styles.radioCircle} ${data.reportId === r.id ? styles.radioCircleSelected : ''}`} />
              <div className={styles.reportOptionInfo}>
                <div className={styles.reportOptionTitle}>{r.title}</div>
                <div className={styles.reportOptionMeta}>
                  Arsa payı: %{(r.landShareRatio * 100).toFixed(0)} · Min. daire: {r.minApartmentPrice.toLocaleString('tr-TR')} ₺
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <button className={styles.skipBtn} onClick={() => onChange({ reportId: '' })}>
        Bu adımı atla →
      </button>
    </div>
  )
}
