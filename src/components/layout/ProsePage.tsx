import React from 'react'
import styles from './ProsePage.module.css'

export interface ProsePageProps {
  title: string
  /** ISO tarih — "Son güncelleme" satırı; verilmezse gizli. */
  updated?: string
  /** Sayfanın taslak olduğunu belirten uyarı şeridi. */
  draftNotice?: string
  children: React.ReactNode
}

/**
 * Statik metin sayfaları (İletişim, Koşullar, Gizlilik) için ortak kabuk —
 * site chrome'u (Navbar/Footer) kök layout'tan gelir, bu yalnız içerik sütunu.
 */
export function ProsePage({ title, updated, draftNotice, children }: ProsePageProps) {
  return (
    <article className={styles.wrap}>
      <h1 className={styles.title}>{title}</h1>
      {updated && (
        <p className={styles.updated}>Son güncelleme: {updated}</p>
      )}
      {draftNotice && <p className={styles.draft}>{draftNotice}</p>}
      <div className={styles.body}>{children}</div>
    </article>
  )
}
