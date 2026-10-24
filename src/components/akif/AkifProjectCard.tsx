import type { ProjectCard } from '@/lib/ai/akif/contract'
import styles from './AkifProjectCard.module.css'

const TITLES: Record<ProjectCard['op'], string> = {
  found: 'Projeler bulundu',
  summary: 'Proje özeti',
  created: 'Proje oluşturuldu',
  updated: 'Proje güncellendi',
  fact_saved: 'Bilgi kaydedildi',
  needs_signup: 'Bunun için üye olman gerekiyor',
  not_found: 'Proje bulunamadı',
  rate_limited: 'Çok sık denedin, biraz bekle',
  failed: 'İşlem tamamlanamadı',
  price_estimate: 'Fiyat tahmini hazır',
  price_unavailable: 'Fiyat tahmini şu an yok',
  calculated: 'Hesap tamamlandı',
}

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null)

export interface AkifProjectCardProps {
  card: ProjectCard
}

export function AkifProjectCard({ card }: AkifProjectCardProps) {
  const data = card.data && typeof card.data === 'object' ? card.data : {}
  const name = str(data.name) ?? str(data.title) ?? str(data.projectName)
  return (
    <div className={styles.card}>
      <span className={styles.title} data-testid="akif-project-title">
        {TITLES[card.op] ?? 'Proje işlemi'}
      </span>
      {name && <span className={styles.name}>{name}</span>}
    </div>
  )
}
