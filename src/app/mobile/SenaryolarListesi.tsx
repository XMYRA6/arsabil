"use client";

import Link from 'next/link';
import styles from './mobile.module.css';

export type SenaryoOzeti = { id: string; name: string; currentVersionNumber: number };

/** Kaydedilmiş Studio senaryoları; satır, senaryonun son versiyonunun vitrinine gider. */
export function SenaryolarListesi({ senaryolar }: { senaryolar: SenaryoOzeti[] }) {
    return (
        <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Senaryolarım</h2>
            {senaryolar.length === 0 ? (
                <p className={styles.emptyNote}>
                    Henüz senaryo yok. <Link href="/hesapla" className={styles.emptyLink}>Hesapla →</Link>
                </p>
            ) : (
                <div className={styles.listStack}>
                    {senaryolar.slice(0, 3).map(s => (
                        <Link key={s.id} href={`/studio/scenarios/${s.id}/versions/${s.currentVersionNumber}/vitrin`} className={styles.listRow}>
                            <span className={styles.listTitle}>{s.name}</span>
                            <span className={styles.listMeta}>Versiyon {s.currentVersionNumber}</span>
                        </Link>
                    ))}
                </div>
            )}
        </section>
    );
}
