import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getSeoAreas } from '@/lib/areaSeo/seoAreaDeps'
import { findBySlug } from '@/lib/areaSeo/listSeoAreas'
import { buildAreaSeoCard } from '@/lib/areaSeo/areaSeoCard'
import { createAreaSeoCardDeps } from '@/lib/areaSeo/areaSeoCardDeps'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { PriceTrendChart } from '@/components/charts/PriceTrendChart'
import styles from '../../areaSeo.module.css'

type Params = { il: string; ilce: string }

export async function generateStaticParams(): Promise<Params[]> {
  const entries = await getSeoAreas('ilce')
  return entries.map((e) => ({ il: e.ilSlug, ilce: e.ilceSlug! }))
}

export const dynamicParams = true
export const revalidate = 86400

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { il, ilce } = await params
  const entries = await getSeoAreas('ilce')
  const entry = findBySlug(entries, { il, ilce })
  if (!entry) return { title: 'Arsa Fiyatları | ArsaBil' }

  const year = new Date().getFullYear()
  return {
    title: `${entry.ilceDisplay} Arsa Fiyatları ${year} — ${entry.ilDisplay} | ArsaBil`,
    description: `${entry.ilceDisplay} (${entry.ilDisplay}) ilçesindeki mahallelerin güncel arsa m² fiyatları ve 12 aylık fiyat trendi.`,
  }
}

export default async function IlcePage({ params }: { params: Promise<Params> }) {
  const { il, ilce } = await params
  const [ilceEntries, mahalleEntries] = await Promise.all([getSeoAreas('ilce'), getSeoAreas('mahalle')])
  const entry = findBySlug(ilceEntries, { il, ilce })
  if (!entry) notFound()

  const card = await buildAreaSeoCard(entry, createAreaSeoCardDeps())
  if (!card) notFound()

  // il de kontrol edilir — Task 8'deki aynı çapraz-il karışıklığı riski
  // (birden çok ilde aynı adı taşıyan ilçeler, ör. "Merkez") burada da geçerli.
  const mahalleler = mahalleEntries
    .filter((e) => e.ilNorm === entry.ilNorm && e.ilceNorm === entry.ilceNorm)
    .sort((a, b) => b.sampleCount - a.sampleCount)

  return (
    <div className={styles.wrap}>
      <Breadcrumb
        items={[
          { label: 'Anasayfa', href: '/' },
          { label: 'Arsa Fiyatları', href: '/arsa-fiyatlari' },
          { label: entry.ilDisplay, href: `/arsa-fiyatlari/${entry.ilSlug}` },
          { label: entry.ilceDisplay! },
        ]}
      />
      <h1 className={styles.title}>{entry.ilceDisplay} Arsa Fiyatları</h1>
      <p className={styles.subtitle}>
        {entry.ilDisplay} — {entry.sampleCount} ilan verisine dayanıyor.
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

      {card.demographics && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Demografi</h2>
          <p>{card.demographics.summary}</p>
        </div>
      )}

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>{entry.ilceDisplay} İlçesindeki Mahalleler</h2>
        {mahalleler.length === 0 ? (
          <p className={styles.note}>Bu ilçe için henüz yeterli mahalle verisi yok — veri kapsamı genişledikçe burada listelenecek.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Mahalle</th>
                <th>Örnek Sayısı</th>
              </tr>
            </thead>
            <tbody>
              {mahalleler.map((m) => (
                <tr key={m.mahalleSlug}>
                  <td>
                    <Link href={`/arsa-fiyatlari/${m.ilSlug}/${m.ilceSlug}/${m.mahalleSlug}`}>
                      {m.mahalleDisplay} Mahallesi
                    </Link>
                  </td>
                  <td>{m.sampleCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className={styles.ctaRow}>
        <Link href="/deger" className={styles.ctaButton}>
          Bu ilçede kendi parselini değerlendir
        </Link>
      </div>
    </div>
  )
}
