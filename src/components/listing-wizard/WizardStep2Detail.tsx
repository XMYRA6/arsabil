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
                  <strong> — beyanınla %{cmp.diffPct.toFixed(1)} fark var. Hisseli tapuda bu normaldir; emin değilseniz kontrol et.</strong>
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

      <div className={styles.fieldGroup} role="group" aria-label="İlan Türü">
        <span className={styles.label}>İlan Türü</span>
        <div className={styles.segment}>
          {[
            { value: 'SALE', label: 'Satış' },
            { value: 'KAT_KARSILIGI', label: 'Kat karşılığı' },
            { value: 'ORTAKLIK', label: 'Ortaklık' },
          ].map(o => (
            <button
              key={o.value}
              type="button"
              aria-pressed={data.type === o.value}
              className={`${styles.segmentBtn} ${data.type === o.value ? styles.segmentBtnActive : ''}`}
              onClick={() => onChange({ type: o.value })}
            >
              {o.label}
            </button>
          ))}
        </div>
        {/* Jargon yardımı — Impeccable critique P2 (2026-09-17): arsa sahibi
            persona inşaat/hukuk profesyoneli değil, bu ayrımı bilmeyebilir. */}
        <p className={styles.hintText}>
          {data.type === 'KAT_KARSILIGI' && 'Müteahhit arsana bina yapar, karşılığında sana bina içinden daire/pay verir.'}
          {data.type === 'SALE' && 'Arsanı doğrudan, nakit karşılığında satarsın.'}
          {data.type === 'ORTAKLIK' && 'Arsanı sermaye veya iş gücü ortaklığıyla değerlendirirsin, kesin bir daire payı yerine anlaşmaya bağlı bir ortaklık kurulur.'}
        </p>
      </div>

      <div className={styles.twoCol}>
        <div className={styles.fieldGroup} role="group" aria-label="İmar Durumu">
          <span className={styles.label}>İmar Durumu</span>
          <div className={styles.chipRow}>
            {[
              { value: 'KONUT', label: 'Konut' },
              { value: 'TICARI', label: 'Ticari' },
              { value: 'KARMA', label: 'Karma' },
              { value: 'TARIM', label: 'Tarım' },
            ].map(o => (
              <button
                key={o.value}
                type="button"
                aria-pressed={data.zoning === o.value}
                className={`${styles.chip} ${data.zoning === o.value ? styles.chipActive : ''}`}
                onClick={() => onChange({ zoning: data.zoning === o.value ? '' : o.value })}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>Tapu Durumu</label>
          <select className={styles.select} value={data.titleDeed} onChange={e => onChange({ titleDeed: e.target.value })}>
            <option value="">Seç</option>
            <option value="KAT_MULKIYETI">Kat Mülkiyeti</option>
            <option value="ARSA">Arsa Tapusu</option>
            <option value="HISSELI">Hisseli Tapu</option>
            <option value="DIGER">Diğer</option>
          </select>
          {data.titleDeed === 'HISSELI' && (
            <p className={styles.hintText}>
              Arsanın tapuda birden fazla kişi adına, pay olarak kayıtlı olması. Beyan ettiğin alanla tapudaki toplam alan arasında fark olması bu yüzden normaldir.
            </p>
          )}
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
