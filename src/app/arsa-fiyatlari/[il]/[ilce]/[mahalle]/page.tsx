import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getSeoAreas } from '@/lib/areaSeo/seoAreaDeps'
import { findBySlug } from '@/lib/areaSeo/listSeoAreas'
import { buildAreaSeoCard } from '@/lib/areaSeo/areaSeoCard'
import { createAreaSeoCardDeps } from '@/lib/areaSeo/areaSeoCardDeps'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { faultRiskLevel, floodRiskLevel, RISK_LEVEL_LABEL } from '@/lib/areaSeo/riskLevel'
import { SayfaBasligi, StatSatiri, StatKarti, TrendKarti, DegerBandi, trNum, isaretliYuzde, emsalAlt, degisimAlt } from '../../../areaSeoParts'
import styles from '../../../areaSeo.module.css'

type Params = { il: string; ilce: string; mahalle: string }

export async function generateStaticParams(): Promise<Params[]> {
  const entries = await getSeoAreas('mahalle')
  return entries.map((e) => ({ il: e.ilSlug, ilce: e.ilceSlug!, mahalle: e.mahalleSlug! }))
}

export const dynamicParams = true
export const revalidate = 86400

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { il, ilce, mahalle } = await params
  const entries = await getSeoAreas('mahalle')
  const entry = findBySlug(entries, { il, ilce, mahalle })
  if (!entry) return { title: 'Arsa Fiyatları | ArsaBil' }

  const year = new Date().getFullYear()
  const title = `${entry.mahalleDisplay} Mahallesi Arsa Fiyatları ${year} — ${entry.ilceDisplay}, ${entry.ilDisplay} | ArsaBil`
  const description = `${entry.mahalleDisplay} Mahallesi (${entry.ilceDisplay}, ${entry.ilDisplay}) güncel arsa m² fiyatları, 12 aylık fiyat trendi ve risk bilgisi.`
  return { title, description }
}

export default async function MahallePage({ params }: { params: Promise<Params> }) {
  const { il, ilce, mahalle } = await params
  const entries = await getSeoAreas('mahalle')
  const entry = findBySlug(entries, { il, ilce, mahalle })
  if (!entry) notFound()

  const card = await buildAreaSeoCard(entry, createAreaSeoCardDeps())
  if (!card) notFound()

  // il de kontrol edilir — Türkiye'de birden çok ilde aynı adı taşıyan ilçeler
  // var (ör. "Merkez"), yalnız ilceNorm eşleşmesi çapraz-il karışıklığına yol açar.
  const siblings = entries.filter(
    (e) => e.ilNorm === entry.ilNorm && e.ilceNorm === entry.ilceNorm && e.mahalleNorm !== entry.mahalleNorm,
  )
  const degisim = card.priceTrend?.changePct3m ?? null
  const faultLevel = card.risk ? faultRiskLevel(card.risk.faultDistanceM) : null
  const floodLevel = card.risk ? floodRiskLevel(card.risk.floodQ100) : null

  return (
    <div className={styles.wrap}>
      <Breadcrumb
        items={[
          { label: 'Anasayfa', href: '/' },
          { label: 'Arsa fiyatları', href: '/arsa-fiyatlari' },
          { label: entry.ilDisplay, href: `/arsa-fiyatlari/${entry.ilSlug}` },
          { label: entry.ilceDisplay!, href: `/arsa-fiyatlari/${entry.ilSlug}/${entry.ilceSlug}` },
          { label: `${entry.mahalleDisplay} Mahallesi` },
        ]}
      />
      <SayfaBasligi
        baslik={`${entry.mahalleDisplay} Mahallesi arsa fiyatları`}
        aciklama={`${entry.ilceDisplay}, ${entry.ilDisplay} — ${card.stat.sampleCount} emsal verisine dayanıyor.`}
      />

      <StatSatiri>
        <StatKarti
          etiket="Medyan m² fiyatı"
          deger={trNum.format(Math.round(card.stat.medianPricePerSqm))}
          birim="₺"
          alt={emsalAlt(card.stat.sampleCount)}
        />
        <StatKarti
          etiket="Aralık (p25–p75)"
          deger={`${trNum.format(Math.round(card.stat.p25))} – ${trNum.format(Math.round(card.stat.p75))}`}
          birim="₺"
        />
        {degisim != null && (
          <StatKarti etiket="3 aylık değişim" deger={isaretliYuzde(degisim)} ton={degisim >= 0 ? 'iyi' : 'kotu'} alt={degisimAlt(card.priceTrend)} />
        )}
        {card.risk?.faultDistanceM != null && (
          <StatKarti
            etiket="Deprem (fay mesafesi)"
            deger={`${(card.risk.faultDistanceM / 1000).toFixed(1).replace('.', ',')} km`}
            alt={faultLevel ? `${RISK_LEVEL_LABEL[faultLevel]}` : undefined}
          />
        )}
        {card.risk?.floodQ100 != null && (
          <StatKarti
            etiket="Taşkın (Q100)"
            deger={card.risk.floodQ100 ? 'Alan içinde' : 'Alan dışında'}
            alt={floodLevel ? `${RISK_LEVEL_LABEL[floodLevel]}` : undefined}
          />
        )}
      </StatSatiri>

      <TrendKarti
        trend={card.priceTrend}
        ince="Bu mahallede trend verisi henüz sınırlı — yaklaşık bir gösterge olarak değerlendir."
      />

      {card.demographics?.summary && (
        <section className={styles.kart} aria-label="Demografi">
          <h2 className={styles.kartBaslik}>{entry.ilceDisplay} ilçesi demografi (ilçe geneli)</h2>
          <p className={styles.paragraf}>{card.demographics.summary}</p>
        </section>
      )}

      <p className={styles.note}>Şu anda bu mahallede {card.comparableCount} satılık arsa ilanı yayında.</p>

      {siblings.length > 0 && (
        <section className={styles.section} aria-label="Diğer mahalleler">
          <h2 className={styles.bolumBaslik}>{entry.ilceDisplay} ilçesindeki diğer mahalleler</h2>
          <div className={styles.linkGrid}>
            {siblings.map((s) => (
              <Link
                key={s.mahalleSlug}
                href={`/arsa-fiyatlari/${s.ilSlug}/${s.ilceSlug}/${s.mahalleSlug}`}
                className={styles.linkCard}
              >
                <span className={styles.linkUst}>
                  {s.mahalleDisplay}
                  <span className={styles.linkOk} aria-hidden="true">›</span>
                </span>
                {s.medianPricePerSqm != null && (
                  <span className={styles.linkFiyat}>
                    ₺{trNum.format(Math.round(s.medianPricePerSqm))}
                    <span className={styles.linkBirim}>/m²</span>
                  </span>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      <DegerBandi metin="Ada/parsel gir; bu mahalledeki emsallere göre tahmini değer aralığı ve risk özeti." />
    </div>
  )
}
