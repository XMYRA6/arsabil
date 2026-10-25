import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getSeoAreas } from '@/lib/areaSeo/seoAreaDeps'
import { safeStaticParams } from '@/lib/areaSeo/staticParams'
import { findBySlug } from '@/lib/areaSeo/listSeoAreas'
import { buildAreaSeoCard } from '@/lib/areaSeo/areaSeoCard'
import { createAreaSeoCardDeps } from '@/lib/areaSeo/areaSeoCardDeps'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { SayfaBasligi, StatSatiri, StatKarti, TrendKarti, AlanTablosu, DegerBandi, trNum, isaretliYuzde, emsalAlt, degisimAlt } from '../areaSeoParts'
import styles from '../areaSeo.module.css'

type Params = { il: string }

export async function generateStaticParams(): Promise<Params[]> {
  return safeStaticParams('il', (e) => ({ il: e.ilSlug }))
}

export const dynamicParams = true
// Build ortamında DB yok (Docker build) — önbelleğe boş veri girmesin diye istek anında üretilir.
export const dynamic = 'force-dynamic'

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
  const enPahali = [...ilceler].filter((e) => e.medianPricePerSqm != null && e.sampleCount >= 10).sort((a, b) => b.medianPricePerSqm! - a.medianPricePerSqm!)[0]
  const degisim = card.priceTrend?.changePct3m ?? null

  return (
    <div className={styles.wrap}>
      <Breadcrumb
        items={[
          { label: 'Anasayfa', href: '/' },
          { label: 'Arsa fiyatları', href: '/arsa-fiyatlari' },
          { label: entry.ilDisplay },
        ]}
      />
      <SayfaBasligi
        baslik={`${entry.ilDisplay} arsa fiyatları`}
        aciklama={`${entry.ilDisplay} genelinde ilçe bazında güncel arsa m² fiyatları ve 12 aylık trend. ${card.stat.sampleCount} emsal verisine dayanıyor.`}
      />

      <StatSatiri>
        <StatKarti
          etiket="Medyan m² fiyatı"
          deger={trNum.format(Math.round(card.stat.medianPricePerSqm))}
          birim="₺"
          alt={emsalAlt(card.stat.sampleCount, 'İl medyanı')}
        />
        <StatKarti
          genis
          etiket="Aralık (p25–p75)"
          deger={`${trNum.format(Math.round(card.stat.p25))} – ${trNum.format(Math.round(card.stat.p75))}`}
          birim="₺"
        />
        {degisim != null && (
          <StatKarti etiket="3 aylık değişim" deger={isaretliYuzde(degisim)} ton={degisim >= 0 ? 'iyi' : 'kotu'} alt={degisimAlt(card.priceTrend)} />
        )}
        {enPahali && (
          <StatKarti
            etiket="En pahalı ilçe"
            deger={enPahali.ilceDisplay}
            alt={`${trNum.format(Math.round(enPahali.medianPricePerSqm!))} ₺/m² · ${enPahali.sampleCount} emsal`}
          />
        )}
        <StatKarti etiket="Veri kapsamı" deger={card.comparableCount} alt="şu an yayında" />
      </StatSatiri>

      <TrendKarti trend={card.priceTrend} />

      <AlanTablosu
        baslik="İlçelere göre arsa fiyatları"
        ilkKolon="İlçe"
        bos="Bu il için henüz yeterli ilçe verisi yok — veri kapsamı genişledikçe burada listelenecek."
        satirlar={ilceler.map((e) => ({
          ad: e.ilceDisplay!,
          href: `/arsa-fiyatlari/${e.ilSlug}/${e.ilceSlug}`,
          medyan: e.medianPricePerSqm,
          emsal: e.sampleCount,
        }))}
      />

      {/* Impeccable critique P1 (2026-09-17): il seviyesinde ürüne dönüş
          yolu yoktu — ilçe/mahalle sayfalarında zaten vardı. */}
      <DegerBandi />
    </div>
  )
}
