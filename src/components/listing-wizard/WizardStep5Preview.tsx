import styles from './wizard.module.css'
import { WizardFormData } from './types'

const ZONING_LABEL: Record<string, string> = {
  KONUT: 'Konut imarlı', TICARI: 'Ticari imarlı', KARMA: 'Karma imarlı', TARIM: 'Tarım',
}

interface Props {
  data: WizardFormData
  publishing: boolean
  onPublish: () => void
}

export function WizardStep5Preview({ data, publishing, onPublish }: Props) {
  const price = data.price ? Number(data.price).toLocaleString('tr-TR') + ' ₺' : 'Fiyat belirtilmedi'
  const location = [data.district, data.city].filter(Boolean).join(', ') || 'Konum belirtilmedi'
  const canPublish = !!data.title && !!data.city

  return (
    <div className={styles.stepContainer}>
      <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>İlanın marketplace&apos;te şu şekilde görünecek:</p>

      <div className={styles.previewCard}>
        {data.photos.length > 0 ? (
          <img src={data.photos[0].url} alt={data.title} style={{ width: '100%', height: 180, objectFit: 'cover', display: 'block' }} />
        ) : (
          <div className={styles.previewImgPlaceholder}>📷 Fotoğraf eklenmedi</div>
        )}
        <div className={styles.previewBody}>
          <div className={styles.previewTitle}>{data.title || 'Başlık girilmedi'}</div>
          <div className={styles.previewLocation}>📍 {location}</div>
          {(data.landSizeSqm || data.zoning) && (
            <div className={styles.previewMeta}>
              {data.landSizeSqm && `${data.landSizeSqm} m²`}
              {data.landSizeSqm && data.zoning && ' · '}
              {data.zoning && ZONING_LABEL[data.zoning]}
            </div>
          )}
          <div className={styles.previewPrice}>{price}</div>
        </div>
      </div>

      <button className={styles.publishBtn} onClick={onPublish} disabled={publishing || !canPublish}>
        {publishing ? 'Yayınlanıyor...' : '🚀 İlanı Yayınla'}
      </button>

      {!canPublish && (
        <p className={styles.validationError}>Yayınlamak için başlık (Adım 2) ve il (Adım 1) zorunlu.</p>
      )}
    </div>
  )
}
