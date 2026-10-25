import type { ParcelCompareCard, ParcelCompareRow } from '@/lib/ai/akif/contract'
import { AkifRecommendation } from './AkifRecommendation'
import styles from './AkifParcelCompareCard.module.css'

const tl = (n: number) => `${n.toLocaleString('tr-TR')} ₺`
const isNum = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n)
const money = (n: unknown) => (isNum(n) ? tl(n) : '—')

const CONFIDENCE: Record<string, string> = { yuksek: 'Yüksek', orta: 'Orta', dusuk: 'Düşük' }
const STATUS: Record<string, string> = {
  ambiguous: 'Birden fazla eşleşme',
  parcel_not_found: 'Parsel bulunamadı',
  location_not_found: 'Parsel bulunamadı',
  parcel_unavailable: 'Veri şu an alınamadı',
}
// AkifParcelCard'da üyelik bağlantısı yok; projedeki üyelik sayfası /register.
const UPGRADE_HREF = '/register'

function range(r: ParcelCompareRow): string {
  return isNum(r.rangeLow) && isNum(r.rangeHigh) ? `${tl(r.rangeLow)} – ${tl(r.rangeHigh)}` : '—'
}

export interface AkifParcelCompareCardProps {
  card: ParcelCompareCard
}

export function AkifParcelCompareCard({ card }: AkifParcelCompareCardProps) {
  const rows = Array.isArray(card.rows) ? card.rows : []
  const member = card.tier === 'member'
  const rec = card.recommendation
  const recRow = rec ? rows[rec.rowIndex] : undefined
  return (
    <div className={styles.card}>
      <div className={styles.title}>Parsel Karşılaştırma</div>
      <div className={styles.scroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Parsel</th>
              <th>Alan</th>
              {member && <th>Tahmin</th>}
              {member && <th>₺/m²</th>}
              {member && <th>Güven</th>}
              <th>Aralık</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const recommended = !!rec && rec.rowIndex === i
              const resolved = r.status === 'resolved'
              const cands =
                r.status === 'ambiguous' && Array.isArray(r.candidates)
                  ? r.candidates.filter((c) => typeof c === 'string')
                  : []
              return (
                <tr
                  key={i}
                  className={recommended ? styles.recommended : undefined}
                  aria-current={recommended ? 'true' : undefined}
                >
                  <td>
                    <div>{r.label}</div>
                    {recommended && <span className={styles.badge}>Önerilen</span>}
                    {!resolved && (
                      <div className={styles.status}>
                        <div>{STATUS[r.status] ?? STATUS.parcel_unavailable}</div>
                        {cands.length > 0 && (
                          <ul className={styles.cands}>
                            {cands.map((c, j) => (
                              <li key={j}>{c}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </td>
                  <td>{resolved && isNum(r.areaSqm) ? `${r.areaSqm.toLocaleString('tr-TR')} m²` : '—'}</td>
                  {member && <td>{resolved ? money(r.estimate) : '—'}</td>}
                  {member && <td>{resolved ? money(r.pricePerSqm) : '—'}</td>}
                  {member && <td>{resolved && r.confidence ? (CONFIDENCE[r.confidence] ?? '—') : '—'}</td>}
                  <td>{resolved ? range(r) : '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {card.upgradeHint && !member && (
        <p className={styles.upgrade}>
          Tahmin, m² fiyatı ve güven düzeyi için <a href={UPGRADE_HREF}>üye ol</a>.
        </p>
      )}
      {rec && recRow && <AkifRecommendation recommendation={rec} rowLabel={recRow.label} />}
      {card.note && <p className={styles.note}>{card.note}</p>}
    </div>
  )
}
