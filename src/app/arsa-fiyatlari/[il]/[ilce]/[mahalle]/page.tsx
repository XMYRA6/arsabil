import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getSeoAreas } from '@/lib/areaSeo/seoAreaDeps'
import { findBySlug } from '@/lib/areaSeo/listSeoAreas'
import { buildAreaSeoCard } from '@/lib/areaSeo/areaSeoCard'
import { createAreaSeoCardDeps } from '@/lib/areaSeo/areaSeoCardDeps'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { PriceTrendChart } from '@/components/charts/PriceTrendChart'
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

  return (
    <div className={styles.wrap}>
      <Breadcrumb
        items={[
          { label: 'Anasayfa', href: '/' },
          { label: 'Arsa Fiyatları', href: '/arsa-fiyatlari' },
          { label: entry.ilDisplay, href: `/arsa-fiyatlari/${entry.ilSlug}` },
          { label: entry.ilceDisplay!, href: `/arsa-fiyatlari/${entry.ilSlug}/${entry.ilceSlug}` },
          { label: `${entry.mahalleDisplay} Mahallesi` },
        ]}
      />
      <h1 className={styles.title}>{entry.mahalleDisplay} Mahallesi Arsa Fiyatları</h1>
      <p className={styles.subtitle}>
        {entry.ilceDisplay}, {entry.ilDisplay} — {entry.sampleCount} ilan verisine dayanıyor.
      </p>

      <div className={styles.statCard}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Medyan ₺/m²</span>
          <span className={styles.statValue}>{Math.round(card.stat.medianPricePerSqm).toLocaleString('tr-TR')} ₺</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Aralık (p25–p75)</span>
          <span className={styles.statValue}>
            {Math.round(card.stat.p25).toLocaleString('tr-TR')} – {Math.round(card.stat.p75).toLocaleString('tr-TR')} ₺
          </span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Örnek sayısı</span>
          <span className={styles.statValue}>{card.stat.sampleCount}</span>
        </div>
      </div>

      {card.priceTrend && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>12 Aylık Fiyat Trendi</h2>
          <PriceTrendChart
            points={card.priceTrend.points}
            changePct3m={card.priceTrend.changePct3m}
            thinTrend={card.priceTrend.thinTrend}
          />
          {card.priceTrend.thinTrend && (
            <p className={styles.note}>Bu mahallede trend verisi henüz sınırlı — yaklaşık bir gösterge olarak değerlendirin.</p>
          )}
        </div>
      )}

      {card.risk && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Deprem ve Taşkın Riski</h2>
          <p>
            {card.risk.faultDistanceM != null
              ? `Bu mahallenin merkezine en yakın diri fay hattı: ${(card.risk.faultDistanceM / 1000).toFixed(1)} km.`
              : 'Fay hattı mesafesi bu mahalle için hesaplanamadı.'}
            {' '}
            {card.risk.floodQ100 != null
              ? card.risk.floodQ100
                ? 'Bu bölge 100 yıllık taşkın (Q100) risk alanı içinde.'
                : 'Bu bölge 100 yıllık taşkın (Q100) risk alanı dışında.'
              : ''}
          </p>
        </div>
      )}

      {card.demographics && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>{entry.ilceDisplay} İlçesi Demografi (ilçe geneli)</h2>
          <p>{card.demographics.summary}</p>
        </div>
      )}

      <div className={styles.section}>
        <p>Son dönemde bu mahallede {card.comparableCount} satılık arsa ilanı gözlemlendi.</p>
      </div>

      {siblings.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>{entry.ilceDisplay} İlçesindeki Diğer Mahalleler</h2>
          <div className={styles.linkGrid}>
            {siblings.map((s) => (
              <Link
                key={s.mahalleSlug}
                href={`/arsa-fiyatlari/${s.ilSlug}/${s.ilceSlug}/${s.mahalleSlug}`}
                className={styles.linkCard}
              >
                {s.mahalleDisplay}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className={styles.ctaRow}>
        <Link href="/deger" className={styles.ctaButton}>
          Bu mahallede kendi parselini değerlendir
        </Link>
        <Link href="/hesapla" className={styles.ctaButtonSecondary}>
          Kat karşılığı fizibilite hesapla
        </Link>
      </div>
    </div>
  )
}
