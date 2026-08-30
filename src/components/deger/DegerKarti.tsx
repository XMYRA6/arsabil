import Link from 'next/link'
import type { DegerCardDTO } from '@/lib/deger/card'
import { formatFaultDistance } from '@/lib/risk/formatDistance'
import styles from './DegerKarti.module.css'

export interface DegerKartiProps {
  card: DegerCardDTO
  isLoggedIn: boolean
  parcelQuery: string
}

const tl = (n: number) => `${n.toLocaleString('tr-TR')} ₺`

const CONFIDENCE_LABEL: Record<string, string> = {
  yuksek: 'Yüksek',
  orta: 'Orta',
  dusuk: 'Düşük',
}

export function DegerKarti({ card, isLoggedIn, parcelQuery }: DegerKartiProps) {
  const { parcel, risk, value } = card

  return (
    <div className={styles.card}>
      <div className={styles.parcel}>
        {parcel.il} / {parcel.ilce} {parcel.mahalle} — Ada {parcel.ada}, Parsel {parcel.parsel} · {parcel.areaSqm.toLocaleString('tr-TR')} m²
      </div>
      <div className={styles.map} data-testid="deger-map" />

      {value.insufficientData ? (
        <p className={styles.insufficient}>Bu bölge için yeterli emsal verisi yok.</p>
      ) : (
        <>
          <div className={styles.label}>Tahmini Değer Aralığı</div>
          <div className={styles.range}>
            {tl(value.freeRangeLow!)} – {tl(value.freeRangeHigh!)}
          </div>
          <div className={styles.sub}>≈ {value.pricePerSqmCoarse!.toLocaleString('tr-TR')} ₺/m² bölge medyanı</div>
          {value.thinData && (
            <p className={styles.caveat}>⚠︎ Sınırlı emsal verisine dayanıyor; aralık geniş olabilir.</p>
          )}
        </>
      )}

      <div className={styles.chips}>
        {risk.status === 'unavailable' ? (
          <span className={styles.chip}>Risk verisi alınamadı</span>
        ) : (
          <>
            <span className={`${styles.chip} ${styles.chipWarn}`}>
              Faya {formatFaultDistance(risk.faultDistanceM)}
            </span>
            {risk.floodQ100 === true && <span className={`${styles.chip} ${styles.chipWarn}`}>Q100 taşkın bölgesi</span>}
            {risk.floodQ100 === false && <span className={`${styles.chip} ${styles.chipOk}`}>Taşkın riski yok</span>}
          </>
        )}
      </div>

      {!value.insufficientData && (
        <>
          <div className={styles.divider} />
          {isLoggedIn ? (
            <div>
              <div className={styles.label}>Net Tahmini Değer</div>
              <div className={styles.range}>{tl(value.estimate!)}</div>
              <div className={styles.sub}>
                {tl(value.memberRangeLow!)} – {tl(value.memberRangeHigh!)} · Güven: {CONFIDENCE_LABEL[value.confidence!] ?? value.confidence}
              </div>
              {value.pricePerSqm?.mahalle != null && (
                <div className={styles.memberRow}>
                  Mahalle ₺/m²: {value.pricePerSqm.mahalle.toLocaleString('tr-TR')}
                  {value.sampleCount?.mahalle != null && ` (${value.sampleCount.mahalle} emsal)`}
                </div>
              )}
              {value.pricePerSqm?.ilce != null && (
                <div className={styles.memberRow}>
                  İlçe ₺/m²: {value.pricePerSqm.ilce.toLocaleString('tr-TR')}
                  {value.sampleCount?.ilce != null && ` (${value.sampleCount.ilce} emsal)`}
                </div>
              )}
              <Link href={value.feasibilityHref ?? '/hesapla'} className={styles.feasLink}>
                Bu parselle fizibilite hesapla →
              </Link>
            </div>
          ) : (
            <div className={styles.gatedWrap}>
              <div className={styles.blurred} aria-hidden="true">
                <div className={styles.label}>Net Değer</div>
                <div className={styles.range}>₺••••••</div>
                <div className={styles.memberRow}>Mahalle ₺/m²: ••••</div>
                <div className={styles.memberRow}>İlçe ₺/m²: ••••</div>
              </div>
              <div className={styles.overlay}>
                <strong>Net değer + mahalle kırılımı</strong>
                <span className={styles.sub}>Ücretsiz üyelikle aç</span>
                <Link
                  href={`/register?callbackUrl=${encodeURIComponent('/deger?' + parcelQuery)}`}
                  className={styles.cta}
                >
                  Üye Ol
                </Link>
              </div>
            </div>
          )}
        </>
      )}

      <p className={styles.soon}>Yakında (üyelere): Emsal ilanlar · Fiyat trendi · Uzman görüşü</p>
    </div>
  )
}
