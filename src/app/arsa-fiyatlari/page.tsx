import type { Metadata } from 'next'
import { getSeoAreas } from '@/lib/areaSeo/seoAreaDeps'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { IllerListesi, type IlKarti } from './IllerListesi'
import { SayfaBasligi, DegerBandi } from './areaSeoParts'
import styles from './areaSeo.module.css'

// Build ortamında DB yok (Docker build) — önbelleğe boş veri girmesin diye istek anında üretilir.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Arsa Fiyatları | ArsaBil',
  description: 'Türkiye genelinde il, ilçe ve mahalle bazında güncel arsa m² fiyatları, fiyat trendi ve risk bilgisi.',
}

export default async function ArsaFiyatlariPage() {
  const iller = await getSeoAreas('il')
  const kartlar: IlKarti[] = iller.map((e) => ({
    slug: e.ilSlug,
    ad: e.ilDisplay,
    medyan: e.medianPricePerSqm,
    emsal: e.sampleCount,
  }))

  return (
    <div className={styles.wrap}>
      <Breadcrumb items={[{ label: 'Anasayfa', href: '/' }, { label: 'Arsa fiyatları' }]} />
      <SayfaBasligi
        baslik="Arsa fiyatları"
        aciklama="İl, ilçe ve mahalle bazında güncel arsa m² fiyatları, fiyat trendi ve risk bilgisi."
      />

      {kartlar.length === 0 ? (
        <p className={styles.note}>Şu an gösterilecek veri yok — veri kapsamı genişledikçe burada listelenecek.</p>
      ) : (
        <IllerListesi iller={kartlar} />
      )}

      <DegerBandi />
    </div>
  )
}
