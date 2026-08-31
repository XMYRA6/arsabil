'use client'

import { useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import type { DegerCardDTO } from '@/lib/deger/card'
import { formatFaultDistance } from '@/lib/risk/formatDistance'
import { polygonCentroid } from '@/lib/geo/polygonCentroid'
import { DegerMiniMap } from './DegerMiniMap'
import { PriceTrendChart } from '@/components/charts/PriceTrendChart'
import styles from './DegerKarti.module.css'

const EmsalMapLazy = dynamic(() => import('./EmsalMap').then((m) => m.EmsalMap), { ssr: false })

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
  const isMember = isLoggedIn
  const [showMap, setShowMap] = useState(false)

  return (
    <div className={styles.card}>
      <div className={styles.parcel}>
        {parcel.il} / {parcel.ilce} {parcel.mahalle} — Ada {parcel.ada}, Parsel {parcel.parsel} · {parcel.areaSqm.toLocaleString('tr-TR')} m²
      </div>
      {card.neighborhood.geojson ? (
        <DegerMiniMap parcelGeometry={parcel.geometry} neighborhoodGeojson={card.neighborhood.geojson} />
      ) : (
        <div className={styles.map} data-testid="deger-map" />
      )}

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
            <span className={`${styles.chip} ${risk.faultDistanceM === null ? styles.chipOk : styles.chipWarn}`}>
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
            value.estimate != null && (
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
            )
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

      {card.comparables.count > 0 ? (
        <div className={styles.emsalBlock}>
          <div className={styles.divider} />
          <div className={styles.label}>Bölgedeki Emsal İlanlar ({card.comparables.count})</div>
          {isMember && card.comparables.items ? (
            <>
              {card.comparables.items.map((c, i) => (
                <div key={i} className={styles.emsalRow}>
                  <strong>{c.pricePerSqm != null ? `${c.pricePerSqm.toLocaleString('tr-TR')} ₺/m²` : '—'}</strong>
                  {c.areaSqm != null && <span> · {c.areaSqm.toLocaleString('tr-TR')} m²</span>}
                  {c.price != null && <span> · {c.price.toLocaleString('tr-TR')} ₺</span>}
                  <span> · {c.approxDistance ? '~' : ''}{(c.distanceM / 1000).toFixed(1).replace('.', ',')} km</span>
                  {c.listedAt && <span> · {new Date(c.listedAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}</span>}
                  {' '}
                  <a href={c.sourceUrl} target="_blank" rel="noopener nofollow" className={styles.emsalLink}>Emlakjet ↗</a>
                </div>
              ))}
              <button type="button" className={styles.mapToggle} onClick={() => setShowMap(true)}>
                Emsalları haritada gör →
              </button>
            </>
          ) : (
            <div className={styles.gatedWrap}>
              <div className={styles.blurred} aria-hidden="true">
                <div className={styles.emsalRow}><strong>•••• ₺/m²</strong> · •••• m² · •••• km</div>
                <div className={styles.emsalRow}><strong>•••• ₺/m²</strong> · •••• m² · •••• km</div>
                <div className={styles.emsalRow}><strong>•••• ₺/m²</strong> · •••• m² · •••• km</div>
              </div>
              <div className={styles.overlay}>
                <strong>{card.comparables.count} emsal ilan</strong>
                <span className={styles.sub}>Ücretsiz üyelikle aç</span>
                <Link href={`/register?callbackUrl=${encodeURIComponent('/deger?' + parcelQuery)}`} className={styles.cta}>Üye Ol</Link>
              </div>
            </div>
          )}
        </div>
      ) : isMember ? (
        <p className={styles.sub}>Bu bölgede aktif emsal ilan bulunamadı.</p>
      ) : null}

      {showMap && isMember && card.comparables.items && card.comparables.items.length > 0 && (
        <EmsalMapLazy
          parcelGeometry={parcel.geometry}
          neighborhoodGeojson={card.neighborhood.geojson}
          comparables={card.comparables.items}
          center={
            polygonCentroid(parcel.geometry) ?? {
              lat: card.comparables.items[0].lat,
              lng: card.comparables.items[0].lng,
            }
          }
          onClose={() => setShowMap(false)}
        />
      )}

      {isMember && card.priceTrend && (
        <div className={styles.trendBlock}>
          <div className={styles.divider} />
          <div className={styles.label}>Bölge Fiyat Eğilimi</div>
          <PriceTrendChart
            points={card.priceTrend.points}
            changePct3m={card.priceTrend.changePct3m}
            thinTrend={card.priceTrend.thinTrend}
          />
        </div>
      )}

      <p className={styles.disclaimer}>v1 tahmini; imar, cephe, eğim gibi parsel özellikleri hariç.</p>
      <p className={styles.soon}>Yakında (üyelere): Uzman görüşü</p>
    </div>
  )
}
