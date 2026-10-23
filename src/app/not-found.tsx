'use client'

import Link from 'next/link'
import { resolveScene } from '@/lib/dioramas/scene'
import { useThemeZaman } from '@/components/home/useThemeZaman'
import styles from './not-found.module.css'

export default function NotFound() {
    const zaman = useThemeZaman()
    const sahne = resolveScene({ tur: 'arsa', varyant: 'agacli', egim: 'duz', zaman })
    return (
        <main className={styles.main}>
            {/* eslint-disable-next-line @next/next/no-img-element -- yerel statik WebP */}
            <img className={styles.diorama} src={sahne.src800} alt="" />
            <p className={styles.kicker}>404</p>
            <h1 className={styles.title}>Sayfa bulunamadı</h1>
            <p className={styles.text}>Aradığın sayfa taşınmış ya da hiç var olmamış olabilir. Ana sayfadan devam edebilirsin.</p>
            <div className={styles.actions}>
                <Link href="/" className={styles.primary}>Ana sayfaya dön</Link>
                <Link href="/deger" className={styles.soft}>Arsa değerini öğren</Link>
            </div>
        </main>
    )
}
