'use client'

import Image from 'next/image'
import { useThemeZaman } from '@/components/home/useThemeZaman'
import { resolveScene, type Tur } from '@/lib/dioramas/scene'
import type { WizardFormData } from '@/components/listing-wizard/types'
import styles from './onizleme.module.css'

const TYPE_LABEL: Record<string, string> = {
  SALE: 'Satış',
  KAT_KARSILIGI: 'Kat karşılığı',
  ORTAKLIK: 'Ortaklık',
}

/** İlan türü + imardan diorama sahnesi (fotoğraf yokken). Pazar yeri kartıyla aynı eşleme. */
function sahneSec(type: string, zoning: string): { tur: Tur; varyant: string } {
  if (type === 'KAT_KARSILIGI') return { tur: 'kat', varyant: 'bitmis' }
  if (type === 'ORTAKLIK') return { tur: 'ticari', varyant: 'ofis' }
  switch (zoning) {
    case 'TARIM': return { tur: 'tarla', varyant: 'bugday' }
    case 'TICARI': return { tur: 'ticari', varyant: 'ofis' }
    case 'KONUT': return { tur: 'villa', varyant: 'modern' }
    default: return { tur: 'arsa', varyant: 'agacsiz' }
  }
}

const trNum = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 })

/**
 * Sihirbazın sağındaki "Önizleme" kartı — Figma 07 (İlan oluştur). Form
 * girdilerinden canlı türetilir; hiçbir veri uydurulmaz: boş alanlar gizlenir.
 */
export function IlanOnizleme({ form }: { form: WizardFormData }) {
  const zaman = useThemeZaman()
  const foto = form.photos[0]?.url
  const sahne = resolveScene({ ...sahneSec(form.type, form.zoning), egim: 'duz', zaman })
  const konum = [form.district, form.city].filter(Boolean).join(', ')
  const baslik = form.title || konum || 'İlan başlığı'
  const fiyat = form.price ? Number(form.price) : 0
  const alan = form.landSizeSqm ? Number(form.landSizeSqm) : 0
  const meta = [fiyat > 0 ? `₺${trNum.format(fiyat)}` : null, alan > 0 ? `${trNum.format(alan)} m²` : null]
    .filter(Boolean).join(' · ')

  return (
    <section className={styles.card} aria-label="Önizleme">
      <h3 className={styles.title}>Önizleme</h3>
      <div className={styles.sahne}>
        {foto ? (
          <Image fill unoptimized src={foto} alt={baslik} style={{ objectFit: 'cover' }} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- yerel statik WebP
          <img className={styles.diorama} src={sahne.src800} alt="" />
        )}
      </div>
      <p className={styles.baslik}>{baslik}</p>
      {meta && <p className={styles.meta}>{meta}</p>}
      <div className={styles.chips}>
        <span className={`${styles.chip} ${styles.chipTur}`}>{TYPE_LABEL[form.type] ?? 'Kat karşılığı'}</span>
      </div>
      {!form.reportId && <p className={styles.note}>Fizibilite skoru bağlandığında burada görünür.</p>}
    </section>
  )
}
