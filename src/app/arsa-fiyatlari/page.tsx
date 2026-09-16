import type { Metadata } from 'next'
import Link from 'next/link'
import { getSeoAreas } from '@/lib/areaSeo/seoAreaDeps'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import styles from './areaSeo.module.css'

export const revalidate = 86400

export const metadata: Metadata = {
  title: 'Arsa Fiyatları | ArsaBil',
  description: 'Türkiye genelinde il, ilçe ve mahalle bazında güncel arsa m² fiyatları, fiyat trendi ve risk bilgisi.',
}

export default async function ArsaFiyatlariPage() {
  const iller = await getSeoAreas('il')
  const sorted = [...iller].sort((a, b) => b.sampleCount - a.sampleCount)

  return (
    <div className={styles.wrap}>
      <Breadcrumb items={[{ label: 'Anasayfa', href: '/' }, { label: 'Arsa Fiyatları' }]} />
      <h1 className={styles.title}>Arsa Fiyatları</h1>
      <p className={styles.subtitle}>
        İl, ilçe ve mahalle bazında güncel arsa m² fiyatlarını, fiyat trendini ve risk bilgisini inceleyin.
      </p>

      {sorted.length === 0 ? (
        <p className={styles.note}>Şu an gösterilecek veri yok — veri kapsamı genişledikçe burada listelenecek.</p>
      ) : (
        <div className={styles.linkGrid}>
          {sorted.map((e) => (
            <Link key={e.ilSlug} href={`/arsa-fiyatlari/${e.ilSlug}`} className={styles.linkCard}>
              {e.ilDisplay}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
