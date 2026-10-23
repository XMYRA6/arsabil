'use client'

import Link from 'next/link'
import { resolveScene } from '@/lib/dioramas/scene'
import { useThemeZaman } from '@/components/home/useThemeZaman'
import { sahneSec } from '@/app/dashboard/sahneSec'
import styles from './page.module.css'

export function IlanKarti({ id, baslik, price }: { id: string; baslik: string; price: number | null }) {
    const zaman = useThemeZaman()
    const sahne = resolveScene({ ...sahneSec(null, null), egim: 'duz', zaman })
    return (
        <Link href={`/listing/${id}`} className={styles.ilanKarti}>
            <span className={styles.ilanFoto}>
                {/* eslint-disable-next-line @next/next/no-img-element -- yerel statik WebP */}
                <img src={sahne.src800} alt="" loading="lazy" />
            </span>
            <span className={styles.ilanGovde}>
                <span className={styles.ilanBaslik}>{baslik}</span>
                <span className={styles.ilanFiyat}>{price ? `₺${price.toLocaleString('tr-TR')}` : 'Fiyat yok'}</span>
            </span>
        </Link>
    )
}
