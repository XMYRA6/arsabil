'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import styles from '../panelListe.module.css'

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
  hesap: 'Hesap',
  arsaAlani: 'Arsa alanı (m²)',
  emsal: 'Emsal',
  arsaSahibiPayiYuzde: 'Arsa sahibi payı (%)',
  daireBuyuklugu: 'Daire büyüklüğü (m²)',
  katAdedi: 'Kat adedi',
  birimMaliyet: 'Birim maliyet (TL/m²)',
  kaliteSinifi: 'Kalite sınıfı',
  name: 'Proje adı',
}

// Figma 10: sayısal girdiler kutu olarak gösterilir (etiket, birim). Hesap nesnesi revizyon listesinde kalır.
const GIRDI_KARTLARI: Record<string, [string, string]> = {
  arsaAlani: ['Arsa alanı', ' m²'],
  emsal: ['Emsal', ''],
  arsaSahibiPayiYuzde: ['Arsa sahibi payı', '%'],
  daireBuyuklugu: ['Daire büyüklüğü', ' m²'],
  katAdedi: ['Kat adedi', ''],
  birimMaliyet: ['Birim maliyet', ' ₺/m²'],
  kaliteSinifi: ['Kalite sınıfı', ''],
}
const formatGirdi = (v: unknown, birim: string) => {
  const t = typeof v === 'number' ? v.toLocaleString('tr-TR') : String(v)
  return birim === '%' ? `%${t}` : `${t}${birim}`
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul', day: '2-digit', month: 'long', year: 'numeric' })
const show = (v: unknown) => {
  if (v === null || v === undefined) return ''
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>
    if (typeof o.mod === 'string') {
      if (o.yapilamaz === true) return `${o.mod} · bu fiyatla yapılamaz`
      const parts = [String(o.mod)]
      if (typeof o.xMaxYuzde === 'number') parts.push(`en fazla %${o.xMaxYuzde} arsa payı`)
      // asiyor: WhatsApp'ın kendisinin "uygulanabilir sunma" dediği senaryo — dashboard'da
      // da aynı sayıları ulaşılabilir gibi göstermemek için ayrı dallandı (review bulgusu).
      if (o.asiyor === true) parts.push('bu paylaşım bu fiyat ve maliyetle uygulanabilir değil')
      else {
        if (typeof o.arsaSahibiDaire === 'number') parts.push(`${o.arsaSahibiDaire} daire`)
        if (typeof o.daireFiyatiTL === 'number') parts.push(`daire ${o.daireFiyatiTL.toLocaleString('tr-TR')} TL`)
      }
      return parts.join(' · ')
    }
    return JSON.stringify(v)
  }
  return String(v)
}

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

  const baslik = (
    <header className={styles.head}>
      <div>
        <h1>Akif projeleri</h1>
        <p>Akif&apos;e WhatsApp&apos;ta ya da sohbette anlatıp &quot;kaydet&quot; dediklerin burada.</p>
      </div>
      <Link href="/akif" className={styles.btnAmber}>Akif ile konuş</Link>
    </header>
  )

  if (error) return <p className={`${styles.state} ${styles.error}`}>Projeler yüklenemedi.</p>
  if (!projects) return <p className={styles.state}>Yükleniyor…</p>
  if (projects.length === 0) {
    return (
      <main className={styles.shell}>
        {baslik}
        <p className={styles.state}>Henüz kayıtlı proje yok. WhatsApp&apos;ta Akif&apos;e arsanı anlatıp &quot;kaydet&quot; dediğinde burada görünür.</p>
      </main>
    )
  }

  return (
    <main className={styles.shell}>
      {baslik}
      <div className={styles.stack}>
        {projects.map((p) => {
          const girdiler = Object.entries(GIRDI_KARTLARI).filter(([k]) => p.inputs?.[k] != null)
          const whatsapp = p.revisions.some((r) => r.channel === 'whatsapp')
          return (
            <article key={p.id} className={styles.card}>
              <div className={styles.cardRow}>
                <div>
                  <h2 className={styles.cardTitle}>{p.name ?? 'Adsız proje'}</h2>
                  <p className={styles.cardMeta}>
                    Oluşturma {fmtDate(p.createdAt)} · Son değişiklik {fmtDate(p.updatedAt)}
                  </p>
                </div>
                <span className={styles.pill}>{whatsapp ? 'Akif · WhatsApp' : 'Akif · Web'}</span>
              </div>
              {girdiler.length > 0 && (
                <div className={styles.metricGrid}>
                  {girdiler.map(([k, [etiket, birim]]) => (
                    <div key={k}>
                      <span>{etiket}</span>
                      <strong>{formatGirdi(p.inputs[k], birim)}</strong>
                    </div>
                  ))}
                </div>
              )}
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
              <div className={styles.actions} style={{ marginTop: 16 }}>
                <Link href="/akif" className={styles.btnSm}>Akif&apos;te aç →</Link>
              </div>
            </article>
          )
        })}
      </div>
    </main>
  )
}
