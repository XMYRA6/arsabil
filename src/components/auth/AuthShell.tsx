'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { ArsabilLogo } from '@/components/ui/ArsabilLogo'
import { useThemeZaman } from '@/components/home/useThemeZaman'
import { resolveScene } from '@/lib/dioramas/scene'
import styles from './AuthShell.module.css'

/**
 * Giriş / kayıt / şifre / e-posta doğrulama ekranlarının ortak kabuğu — Figma 09:
 * solda marka paneli (başlık + diorama), sağda ortalanmış form kartı.
 * Mobilde marka paneli gizlenir, kart tam genişlikte kalır.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  const zaman = useThemeZaman()
  const diorama = resolveScene({ tur: 'villa', varyant: 'modern', egim: 'duz', zaman })

  return (
    <div className={styles.page}>
      <aside className={styles.brand}>
        <Link href="/" className={styles.logo} aria-label="ArsaBil ana sayfa">
          <ArsabilLogo size={34} showText />
        </Link>
        <div className={styles.copy}>
          <h2 className={styles.heading}>
            Geleceğinize
            <span className={styles.accent}>zemin hazırlayın.</span>
          </h2>
          <p className={styles.lead}>
            Arsanızın değerini tahmin etmeyin, verilerle hesaplayın. Arsa sahipleri ve müteahhitlerin güven noktası.
          </p>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element -- yerel statik WebP */}
        <img className={styles.diorama} src={diorama.src800} alt="" />
      </aside>

      <main className={styles.formSide}>
        {/* Mobilde marka paneli gizli: ana sayfaya dönüş yolu burada. */}
        <Link href="/" className={styles.mobileLogo} aria-label="ArsaBil ana sayfa">
          <ArsabilLogo size={30} showText />
        </Link>
        <div className={styles.card}>{children}</div>
      </main>
    </div>
  )
}

const ICONS: Record<'mail' | 'lock' | 'user', ReactNode> = {
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
}

/** Etiketli, soldan ikonlu girdi — tüm kimlik ekranlarında ortak. */
export function AuthField({
  label,
  icon,
  id,
  ...input
}: { label: string; icon: 'mail' | 'lock' | 'user'; id: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>{label}</label>
      <div className={styles.inputWrap}>
        <svg className={styles.inputIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {ICONS[icon]}
        </svg>
        <input id={id} className={styles.input} {...input} />
      </div>
    </div>
  )
}
