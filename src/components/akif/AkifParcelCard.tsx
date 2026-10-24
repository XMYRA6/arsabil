import type { ParcelCard } from '@/lib/ai/akif/contract'
import styles from './AkifParcelCard.module.css'

const tl = (n: number) => `${n.toLocaleString('tr-TR')} ₺`
const isNum = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n)

const NOTES: Record<string, string> = {
  location_not_found: 'Bu konumu bulamadım. Mahalle ve ilçe adını biraz daha net yazar mısın?',
  parcel_not_found: 'Bu ada/parsel için kayıt bulamadım. Numaraları bir daha kontrol eder misin?',
  parcel_unavailable: 'Parsel bilgisine şu an ulaşamıyorum. Birazdan tekrar deneyelim.',
  ambiguous: 'Birden fazla eşleşme buldum. Hangisini kastettiğini söyler misin?',
}

function priceLine(v: NonNullable<ParcelCard['dto']>['value'] | undefined): string | null {
  if (!v || v.insufficientData) return null
  const pp = v.pricePerSqm
  const m = isNum(pp?.mahalle) ? pp?.mahalle : isNum(pp?.ilce) ? pp?.ilce : undefined
  if (isNum(m)) return `${tl(m)} / m²`
  if (isNum(v.freeRangeLow) && isNum(v.freeRangeHigh)) return `${tl(v.freeRangeLow)} – ${tl(v.freeRangeHigh)} / m²`
  if (isNum(v.pricePerSqmCoarse)) return `yaklaşık ${tl(v.pricePerSqmCoarse)} / m²`
  return null
}

export interface AkifParcelCardProps {
  card: ParcelCard
}

export function AkifParcelCard({ card }: AkifParcelCardProps) {
  if (card.status !== 'resolved') {
    const cands = Array.isArray(card.candidates) ? card.candidates.filter((c) => typeof c === 'string') : []
    return (
      <div className={styles.card}>
        <p className={styles.note} data-testid="akif-parcel-note">
          {NOTES[card.status] ?? NOTES.parcel_unavailable}
        </p>
        {cands.length > 0 && (
          <ul className={styles.cands}>
            {cands.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        )}
      </div>
    )
  }
  const p = card.dto?.parcel
  if (!p) return null
  const price = priceLine(card.dto?.value)
  const risk = card.dto?.risk?.status === 'ok' ? 'Risk verisi hazır' : 'Risk verisi şu an yok'
  return (
    <div className={styles.card}>
      <div className={styles.title}>{`${p.mahalle}, ${p.ilce}/${p.il}`}</div>
      <dl className={styles.facts}>
        <div><dt>Parsel</dt><dd>{`${p.ada} ada, ${p.parsel} parsel`}</dd></div>
        <div><dt>Alan</dt><dd>{isNum(p.areaSqm) ? `${p.areaSqm.toLocaleString('tr-TR')} m²` : '—'}</dd></div>
        <div><dt>Birim fiyat</dt><dd>{price ?? '—'}</dd></div>
        <div><dt>Risk</dt><dd>{risk}</dd></div>
      </dl>
    </div>
  )
}
