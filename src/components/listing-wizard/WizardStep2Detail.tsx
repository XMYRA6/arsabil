import styles from './wizard.module.css'
import { WizardFormData } from './types'
import { compareArea } from '@/lib/listing/areaComparison'

interface Props {
  data: WizardFormData
  onChange: (patch: Partial<WizardFormData>) => void
}

export function WizardStep2Detail({ data, onChange }: Props) {
  return (
    <div className={styles.stepContainer}>
      <div className={styles.fieldGroup}>
        <label className={styles.label}>İlan Başlığı *</label>
        <input
          className={styles.input}
          placeholder="Örn: Kadıköy'de 450m² imarlı arsa"
          value={data.title}
          onChange={e => onChange({ title: e.target.value })}
          maxLength={120}
        />
      </div>

      <div className={styles.twoCol}>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>Arsa Alanı (m²) *</label>
          <input
            className={styles.input}
            type="number"
            placeholder="450"
            value={data.landSizeSqm}
            onChange={e => onChange({ landSizeSqm: e.target.value })}
            min={1}
          />
          {data.parcel && (() => {
            const cmp = compareArea(data.landSizeSqm ? Number(data.landSizeSqm) : null, data.parcel.areaSqm)
            return (
              <p className={styles.hintText}>
                Tapu kaydı: {data.parcel.areaSqm.toLocaleString('tr-TR')} m²
                {cmp.status === 'mismatch' && cmp.diffPct !== null && (
                  <strong> — beyanınızla %{cmp.diffPct.toFixed(1)} fark var. Hisseli tapuda bu normaldir; emin değilseniz kontrol edin.</strong>
                )}
              </p>
            )
          })()}
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>İstenen Fiyat (₺)</label>
          <input
            className={styles.input}
            type="number"
            placeholder="5000000"
            value={data.price}
            onChange={e => onChange({ price: e.target.value })}
            min={0}
          />
        </div>
      </div>

      <div className={styles.twoCol}>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>İmar Durumu</label>
          <select className={styles.select} value={data.zoning} onChange={e => onChange({ zoning: e.target.value })}>
            <option value="">Seçiniz</option>
            <option value="KONUT">Konut</option>
            <option value="TICARI">Ticari</option>
            <option value="KARMA">Karma</option>
            <option value="TARIM">Tarım</option>
          </select>
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>Tapu Durumu</label>
          <select className={styles.select} value={data.titleDeed} onChange={e => onChange({ titleDeed: e.target.value })}>
            <option value="">Seçiniz</option>
            <option value="KAT_MULKIYETI">Kat Mülkiyeti</option>
            <option value="ARSA">Arsa Tapusu</option>
            <option value="HISSELI">Hisseli Tapu</option>
            <option value="DIGER">Diğer</option>
          </select>
        </div>
      </div>

      <div className={styles.fieldGroup}>
        <label className={styles.label}>İletişim Telefonu</label>
        <input
          className={styles.input}
          type="tel"
          placeholder="0532 xxx xx xx"
          value={data.phone}
          onChange={e => onChange({ phone: e.target.value })}
        />
      </div>

      <div className={styles.fieldGroup}>
        <label className={styles.label}>Açıklama</label>
        <textarea
          className={styles.textarea}
          placeholder="Arsa hakkında detaylı bilgi..."
          value={data.description}
          onChange={e => onChange({ description: e.target.value })}
          maxLength={1000}
        />
      </div>
    </div>
  )
}
