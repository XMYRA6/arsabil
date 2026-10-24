import type { ScenarioCard } from '@/lib/ai/akif/contract'
import styles from './AkifScenarioCard.module.css'

const tl = (n: number) => `${n.toLocaleString('tr-TR')} ₺`
const num = (n: number | null) => (n === null ? '—' : n.toLocaleString('tr-TR'))
const money = (n: number | null) => (n === null ? '—' : tl(n))

const TITLE: Record<ScenarioCard['kind'], string> = {
  contractor_offers: 'Müteahhit Payı Senaryoları',
  apartment_sizes: 'Daire Büyüklüğü Senaryoları',
}

export interface AkifScenarioCardProps {
  card: ScenarioCard
}

export function AkifScenarioCard({ card }: AkifScenarioCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.title}>{TITLE[card.kind] ?? ''}</div>
      <div className={styles.scroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Senaryo</th>
              <th>Arsa Payı</th>
              <th>Arsa Sah. Daire</th>
              <th>Arsa Sah. Değeri</th>
              <th>Daire Satış</th>
            </tr>
          </thead>
          <tbody>
            {(card.rows ?? []).map((r, i) => (
              <tr key={i}>
                <td>{r.label}</td>
                <td>%{Math.round(r.arsaPayiX * 100)}</td>
                <td>{num(r.arsaSahibiDaireSayisi)}</td>
                <td>{money(r.arsaSahibiDegeriTL)}</td>
                <td>{money(r.daireSatisFiyatiTL)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={styles.note}>{card.emsalNote}</p>
    </div>
  )
}
