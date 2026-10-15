'use client'

import { useEffect, useState } from 'react'
import styles from './page.module.css'

interface Revision {
  field: string
  oldValue: unknown
  newValue: unknown
  changedAt: string
  channel: string
}
interface AkifProject {
  id: string
  name: string | null
  inputs: Record<string, unknown>
  createdAt: string
  updatedAt: string
  parcels: string[]
  revisions: Revision[]
}

const LABELS: Record<string, string> = {
  arsaAlani: 'Arsa alanı (m²)',
  emsal: 'Emsal',
  arsaSahibiPayiYuzde: 'Arsa sahibi payı (%)',
  daireBuyuklugu: 'Daire büyüklüğü (m²)',
  katAdedi: 'Kat adedi',
  birimMaliyet: 'Birim maliyet (TL/m²)',
  kaliteSinifi: 'Kalite sınıfı',
  name: 'Proje adı',
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul', day: '2-digit', month: 'long', year: 'numeric' })
const show = (v: unknown) => (v === null || v === undefined ? '' : String(v))

export default function AkifProjelerPage() {
  const [projects, setProjects] = useState<AkifProject[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let alive = true
    fetch('/api/akif/projeler')
      .then(async (res) => {
        if (!res.ok) throw new Error('http')
        const data = await res.json()
        if (alive) setProjects(data.projects as AkifProject[])
      })
      .catch(() => alive && setError(true))
    return () => {
      alive = false
    }
  }, [])

  if (error) return <p className={styles.error}>Projeler yüklenemedi.</p>
  if (!projects) return <p>Yükleniyor…</p>
  if (projects.length === 0) {
    return <p>Henüz kayıtlı proje yok. WhatsApp&apos;ta Akif&apos;e arsanı anlatıp &quot;kaydet&quot; dediğinde burada görünür.</p>
  }

  return (
    <div className={styles.list}>
      {projects.map((p) => (
        <article key={p.id} className={styles.card}>
          <h2 className={styles.name}>{p.name ?? 'Adsız proje'}</h2>
          <p className={styles.meta}>
            Oluşturma {fmtDate(p.createdAt)} · Son değişiklik {fmtDate(p.updatedAt)}
          </p>
          {p.parcels.map((t) => (
            <p key={t} className={styles.parcel}>
              {t}
            </p>
          ))}
          <ul className={styles.revisions}>
            {p.revisions.map((r, i) => (
              <li key={i} data-testid="revizyon">
                <span className={styles.date}>{fmtDate(r.changedAt)}</span> {LABELS[r.field] ?? r.field}:{' '}
                {show(r.oldValue)} → {show(r.newValue)}
                <span className={styles.channel}> ({r.channel === 'whatsapp' ? 'WhatsApp' : 'Web'})</span>
              </li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  )
}
