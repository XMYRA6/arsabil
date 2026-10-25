import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getSeoAreas } from '@/lib/areaSeo/seoAreaDeps'
import { safeStaticParams } from '@/lib/areaSeo/staticParams'
import { findBySlug } from '@/lib/areaSeo/listSeoAreas'
import { buildAreaSeoCard } from '@/lib/areaSeo/areaSeoCard'
import { createAreaSeoCardDeps } from '@/lib/areaSeo/areaSeoCardDeps'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { SayfaBasligi, StatSatiri, StatKarti, TrendKarti, AlanTablosu, DegerBandi, trNum, isaretliYuzde, emsalAlt, degisimAlt } from '../../areaSeoParts'
import styles from '../../areaSeo.module.css'

type Params = { il: string; ilce: string }

export async function generateStaticParams(): Promise<Params[]> {
  return safeStaticParams('ilce', (e) => ({ il: e.ilSlug, ilce: e.ilceSlug! }))
}

export const dynamicParams = true
// Build ortamında DB yok (Docker build) — önbelleğe boş veri girmesin diye istek anında üretilir.
export const dynamic = 'force-dynamic'

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
  const degisim = card.priceTrend?.changePct3m ?? null

  return (
    <div className={styles.wrap}>
      <Breadcrumb
        items={[
          { label: 'Anasayfa', href: '/' },
          { label: 'Arsa fiyatları', href: '/arsa-fiyatlari' },
          { label: entry.ilDisplay, href: `/arsa-fiyatlari/${entry.ilSlug}` },
          { label: entry.ilceDisplay! },
        ]}
      />
      <SayfaBasligi
        baslik={`${entry.ilceDisplay} arsa fiyatları`}
        aciklama={`${entry.ilceDisplay} ilçesinde (${entry.ilDisplay}) mahalle bazında güncel arsa m² fiyatları. ${card.stat.sampleCount} emsal verisine dayanıyor.`}
      />

      <StatSatiri>
        <StatKarti
          etiket="Medyan m² fiyatı"
          deger={trNum.format(Math.round(card.stat.medianPricePerSqm))}
          birim="₺"
          alt={emsalAlt(card.stat.sampleCount)}
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
        <StatKarti etiket="Veri kapsamı" deger={card.comparableCount} alt="şu an yayında" />
      </StatSatiri>

      <TrendKarti trend={card.priceTrend} />

      {card.demographics?.summary && (
        <section className={styles.kart} aria-label="Demografi">
          <h2 className={styles.kartBaslik}>Demografi</h2>
          <p className={styles.paragraf}>{card.demographics.summary}</p>
        </section>
      )}

      <AlanTablosu
        baslik="Mahallelere göre arsa fiyatları"
        ilkKolon="Mahalle"
        bos="Bu ilçe için henüz yeterli mahalle verisi yok — veri kapsamı genişledikçe burada listelenecek."
        satirlar={mahalleler.map((m) => ({
          ad: `${m.mahalleDisplay} Mahallesi`,
          href: `/arsa-fiyatlari/${m.ilSlug}/${m.ilceSlug}/${m.mahalleSlug}`,
          medyan: m.medianPricePerSqm,
          emsal: m.sampleCount,
        }))}
      />

      <DegerBandi metin="Ada/parsel gir; bu ilçedeki emsallere göre tahmini değer aralığı ve risk özeti." />
    </div>
  )
}
