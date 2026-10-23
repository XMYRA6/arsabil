"use client";

import Link from 'next/link';
import toast from 'react-hot-toast';
import styles from './AppToast.module.css';

type Tip = 'basari' | 'hata';

interface BildirimSecenekleri {
    tip: Tip;
    baslik: string;
    aciklama?: string;
    /** İsteğe bağlı tek eylem bağlantısı. */
    eylem?: { etiket: string; href: string };
    /** ms; varsayılan 3500. */
    sure?: number;
}

/**
 * Uygulama bildirimi: üstte, güvenli alanın altında, yukarıdan süzülerek gelen kart.
 * Modal uyarı (alert) gibi akışı bloklamaz; kendiliğinden kapanır, kapat düğmesi vardır.
 * `prefers-reduced-motion` altında hareket yerine anında görünür (bkz. CSS).
 */
export function bildirimGoster({ tip, baslik, aciklama, eylem, sure = 3500 }: BildirimSecenekleri) {
    return toast.custom(
        (t) => (
            <div
                className={`${styles.kart} ${t.visible ? styles.gir : styles.cik}`}
                role={tip === 'hata' ? 'alert' : 'status'}
                data-tip={tip}
            >
                <span className={styles.ikon} aria-hidden="true">
                    {tip === 'basari' ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                            <path className={styles.tik} d="m5 12.5 4.5 4.5L19 7.5" />
                        </svg>
                    ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 7v6M12 17h.01" />
                        </svg>
                    )}
                </span>
                <span className={styles.metin}>
                    <span className={styles.baslik}>{baslik}</span>
                    {aciklama && <span className={styles.aciklama}>{aciklama}</span>}
                </span>
                {eylem && (
                    <Link href={eylem.href} className={styles.eylem} onClick={() => toast.dismiss(t.id)}>
                        {eylem.etiket}
                    </Link>
                )}
                <button type="button" className={styles.kapat} onClick={() => toast.dismiss(t.id)} aria-label="Kapat">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                        <path d="M6 6l12 12M18 6 6 18" />
                    </svg>
                </button>
            </div>
        ),
        { position: 'top-center', duration: sure },
    );
}
