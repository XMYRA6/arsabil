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
  /** `false` ise kart içindeki mini harita çizilmez (sayfa sol kolonda kendisi gösterir). Varsayılan `true`. */
  showMiniMap?: boolean
}

const tl = (n: number) => `${n.toLocaleString('tr-TR')} ₺`

/** 1.000.000 ve üstü "2,9 M ₺", altı tam sayı — emsal satırları için kısa gösterim. */
const tlKisa = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1).replace('.', ',')} M ₺` : tl(n)

const fmtPerMille = (n: number) => {
  const sign = n > 0 ? '+' : n < 0 ? '−' : ''
  return `${sign}${Math.abs(n).toLocaleString('tr-TR')}‰`
}

const CONFIDENCE_LABEL: Record<string, string> = {
  yuksek: 'Yüksek',
  orta: 'Orta',
  dusuk: 'Düşük',
}

export function DegerKarti({ card, isLoggedIn, parcelQuery, showMiniMap = true }: DegerKartiProps) {
  const { parcel, risk, value } = card
  const isMember = isLoggedIn
  const [showMap, setShowMap] = useState(false)

  const hasDemografiMetric =
    !!card.demographics &&
    (card.demographics.population != null ||
      card.demographics.populationGrowthPerMille != null ||
      card.demographics.medianAge != null ||
      card.demographics.avgHouseholdSize != null)

  const registerHref = `/register?callbackUrl=${encodeURIComponent('/deger?' + parcelQuery)}`

  return (
    <div className={styles.card}>
      <header className={styles.header}>
        <div>
          <h2 className={styles.title}>{parcel.ilce} · {parcel.mahalle}</h2>
          <p className={styles.parcel}>
            {parcel.il} · Ada {parcel.ada} · Parsel {parcel.parsel} · {parcel.areaSqm.toLocaleString('tr-TR')} m²
          </p>
        </div>
        <span className={styles.badge}>Resmi parsel verisi</span>
      </header>

      {showMiniMap && (
        card.neighborhood.geojson ? (
          <DegerMiniMap parcelGeometry={parcel.geometry} neighborhoodGeojson={card.neighborhood.geojson} />
        ) : (
          <div className={styles.map} data-testid="deger-map" />
        )
      )}

      <div className={styles.divider} />

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
                {(value.pricePerSqm?.mahalle != null || value.pricePerSqm?.ilce != null) && (
                  <div className={styles.statRow}>
                    {value.pricePerSqm?.mahalle != null && (
                      <div className={styles.stat}>
                        <span className={styles.statLabel}>Mahalle ₺/m²</span>
                        <span className={styles.statValue}>{value.pricePerSqm.mahalle.toLocaleString('tr-TR')}</span>
                        {value.sampleCount?.mahalle != null && (
                          <span className={styles.statSub}>{value.sampleCount.mahalle} emsal</span>
                        )}
                      </div>
                    )}
                    {value.pricePerSqm?.ilce != null && (
                      <div className={styles.stat}>
                        <span className={styles.statLabel}>İlçe ₺/m²</span>
                        <span className={styles.statValue}>{value.pricePerSqm.ilce.toLocaleString('tr-TR')}</span>
                        {value.sampleCount?.ilce != null && (
                          <span className={styles.statSub}>{value.sampleCount.ilce} emsal</span>
                        )}
                      </div>
                    )}
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
                <div>Net değer ₺••••••</div>
                <div>Mahalle ₺/m²: ••••</div>
                <div>İlçe ₺/m²: ••••</div>
              </div>
              <div className={styles.overlay}>
                <strong>Net değer + mahalle kırılımı</strong>
                <span className={styles.sub}>Ücretsiz üyelikle aç</span>
                <Link href={registerHref} className={styles.cta}>
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
          <h3 className={styles.sectionTitle}>Bölgedeki Emsal İlanlar ({card.comparables.count})</h3>
          {isMember && card.comparables.items ? (
            <>
              <div className={styles.emsalList}>
                {card.comparables.items.map((c, i) => (
                  <div key={i} className={styles.emsalRow}>
                    <span>
                      <strong>{c.pricePerSqm != null ? `${c.pricePerSqm.toLocaleString('tr-TR')} ₺/m²` : '—'}</strong>
                      {c.areaSqm != null && <span> · {c.areaSqm.toLocaleString('tr-TR')} m²</span>}
                      {c.price != null && <span> · {tlKisa(c.price)}</span>}
                      <span> · {c.approxDistance ? '~' : ''}{(c.distanceM / 1000).toFixed(1).replace('.', ',')} km</span>
                      {c.listedAt && <span> · {new Date(c.listedAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}</span>}
                    </span>
                    <a href={c.sourceUrl} target="_blank" rel="noopener nofollow" className={styles.emsalLink} aria-label="İlana git (Emlakjet)">İlana git ↗</a>
                  </div>
                ))}
              </div>
              <button type="button" className={styles.mapToggle} onClick={() => setShowMap(true)}>
                Emsalleri haritada gör →
              </button>
            </>
          ) : (
            <div className={styles.gatedWrap}>
              <div className={styles.blurred} aria-hidden="true">
                <div><strong>•••• ₺/m²</strong> · •••• m² · •••• km</div>
                <div><strong>•••• ₺/m²</strong> · •••• m² · •••• km</div>
                <div><strong>•••• ₺/m²</strong> · •••• m² · •••• km</div>
              </div>
              <div className={styles.overlay}>
                <strong>{card.comparables.count} emsal ilan</strong>
                <span className={styles.sub}>Ücretsiz üyelikle aç</span>
                <Link href={registerHref} className={styles.cta}>Üye Ol</Link>
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
          <h3 className={styles.sectionTitle}>
            Bölge Fiyat Eğilimi{' '}
            <span className={styles.trendScope}>
              · {card.priceTrend.basis === 'mahalle' ? 'Mahalle' : card.priceTrend.basis === 'ilce' ? 'İlçe geneli' : 'İl geneli'}
            </span>
          </h3>
          <PriceTrendChart
            points={card.priceTrend.points}
            changePct3m={card.priceTrend.changePct3m}
            thinTrend={card.priceTrend.thinTrend}
          />
        </div>
      )}

      {isMember && card.demographics && hasDemografiMetric ? (
        <div className={styles.demografiBlock}>
          <div className={styles.divider} />
          <h3 className={styles.sectionTitle}>
            Bölge Demografisi <span className={styles.trendScope}>· İlçe geneli</span>
          </h3>
          {card.demographics.summary && (
            <p className={styles.demografiSummary}>{card.demographics.summary}</p>
          )}
          <div className={styles.demografiGrid}>
            {card.demographics.population != null && (
              <div className={styles.stat}>
                <span className={styles.statLabel}>Nüfus</span>
                <span className={styles.statValue}>{card.demographics.population.toLocaleString('tr-TR')}</span>
              </div>
            )}
            {card.demographics.populationGrowthPerMille != null && (
              <div className={styles.stat}>
                <span className={styles.statLabel}>Yıllık nüfus artışı</span>
                <span className={styles.statValue}>{fmtPerMille(card.demographics.populationGrowthPerMille)}</span>
              </div>
            )}
            {card.demographics.medianAge != null && (
              <div className={styles.stat}>
                <span className={styles.statLabel}>Medyan yaş</span>
                <span className={styles.statValue}>{card.demographics.medianAge.toLocaleString('tr-TR')}</span>
                <span className={styles.statSub}>il geneli</span>
              </div>
            )}
            {card.demographics.avgHouseholdSize != null && (
              <div className={styles.stat}>
                <span className={styles.statLabel}>Ortalama hane</span>
                <span className={styles.statValue}>{card.demographics.avgHouseholdSize.toLocaleString('tr-TR')} kişi</span>
                <span className={styles.statSub}>il geneli</span>
              </div>
            )}
          </div>
          <p className={styles.demografiSource}>Kaynak: TÜİK {card.demographics.dataYear}</p>
        </div>
      ) : !isMember && card.demographicsAvailable ? (
        <div className={styles.demografiBlock}>
          <div className={styles.divider} />
          <h3 className={styles.sectionTitle}>
            Bölge Demografisi <span className={styles.trendScope}>· İlçe geneli</span>
          </h3>
          <div className={styles.gatedWrap}>
            <div className={styles.blurred} aria-hidden="true">
              <div>Nüfus: ••••••</div>
              <div>Yıllık nüfus artışı: ••••</div>
              <div>Medyan yaş: ••••</div>
            </div>
            <div className={styles.overlay}>
              <strong>İlçe demografik profili</strong>
              <span className={styles.sub}>Ücretsiz üyelikle aç</span>
              <Link href={registerHref} className={styles.cta}>Üye Ol</Link>
            </div>
          </div>
        </div>
      ) : null}

      <p className={styles.disclaimer}>v1 tahmini; imar, cephe, eğim gibi parsel özellikleri hariç. Resmi değerleme yerine geçmez.</p>
    </div>
  )
}
