import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getSeoAreas } from '@/lib/areaSeo/seoAreaDeps'
import { findBySlug } from '@/lib/areaSeo/listSeoAreas'
import { buildAreaSeoCard } from '@/lib/areaSeo/areaSeoCard'
import { createAreaSeoCardDeps } from '@/lib/areaSeo/areaSeoCardDeps'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { PriceTrendChart } from '@/components/charts/PriceTrendChart'
import styles from '../areaSeo.module.css'

type Params = { il: string }

export async function generateStaticParams(): Promise<Params[]> {
  const entries = await getSeoAreas('il')
  return entries.map((e) => ({ il: e.ilSlug }))
}

export const dynamicParams = true
export const revalidate = 86400

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { il } = await params
  const entries = await getSeoAreas('il')
  const entry = findBySlug(entries, { il })
  if (!entry) return { title: 'Arsa Fiyatları | ArsaBil' }

  const year = new Date().getFullYear()
  return {
    title: `${entry.ilDisplay} Arsa Fiyatları ${year} | ArsaBil`,
    description: `${entry.ilDisplay} ilindeki ilçelerin güncel arsa m² fiyatları ve 12 aylık fiyat trendi.`,
  }
}

export default async function IlPage({ params }: { params: Promise<Params> }) {
  const { il } = await params
  const [ilEntries, ilceEntries] = await Promise.all([getSeoAreas('il'), getSeoAreas('ilce')])
  const entry = findBySlug(ilEntries, { il })
  if (!entry) notFound()

  const card = await buildAreaSeoCard(entry, createAreaSeoCardDeps())
  if (!card) notFound()

  const ilceler = ilceEntries.filter((e) => e.ilNorm === entry.ilNorm).sort((a, b) => b.sampleCount - a.sampleCount)

  return (
    <div className={styles.wrap}>
      <Breadcrumb
        items={[
          { label: 'Anasayfa', href: '/' },
          { label: 'Arsa Fiyatları', href: '/arsa-fiyatlari' },
          { label: entry.ilDisplay },
        ]}
      />
      <h1 className={styles.title}>{entry.ilDisplay} Arsa Fiyatları</h1>
      <p className={styles.subtitle}>{entry.sampleCount} ilan verisine dayanıyor.</p>

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
      </div>

      {card.priceTrend && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>12 Aylık Fiyat Trendi</h2>
          <p className={styles.note}>
            · {card.priceTrend.basis === 'mahalle' ? 'Mahalle' : card.priceTrend.basis === 'ilce' ? 'İlçe geneli' : 'İl geneli'}
          </p>
          <PriceTrendChart
            points={card.priceTrend.points}
            changePct3m={card.priceTrend.changePct3m}
            thinTrend={card.priceTrend.thinTrend}
          />
        </div>
      )}

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>{entry.ilDisplay} İlindeki İlçeler</h2>
        {ilceler.length === 0 ? (
          <p className={styles.note}>Bu il için henüz yeterli ilçe verisi yok — veri kapsamı genişledikçe burada listelenecek.</p>
        ) : (
          <div className={styles.linkGrid}>
            {ilceler.map((e) => (
              <Link key={e.ilceSlug} href={`/arsa-fiyatlari/${e.ilSlug}/${e.ilceSlug}`} className={styles.linkCard}>
                {e.ilceDisplay}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
