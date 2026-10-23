"use client";

import { useId, type ReactNode } from 'react';
import { IconChevronRight } from '@/components/icons';
import styles from './masaustu.module.css';

export type AcilirBolumProps = {
    baslik: string;
    aciklama: string;
    acik: boolean;
    onToggle: (acik: boolean) => void;
    /** Kapalıyken de DOM'da kalması gereken kimlik (scroll hedefi vb.). */
    id?: string;
    children: ReactNode;
};

/**
 * Katlanır Stüdyo bölümü — Figma 05 (Stüdyo katlanır · Masaüstü 1440).
 * Kapalıyken yalnız başlık satırı; içerik yalnızca açıkken render edilir
 * (ağır önizlemeler kapalıyken hiç çalışmaz).
 */
export function AcilirBolum({ baslik, aciklama, acik, onToggle, id, children }: AcilirBolumProps) {
    const panelId = useId();

    return (
        <section id={id} className={styles.kart} aria-label={baslik}>
            <div className={styles.kartBaslikSatir}>
                <div className={styles.acilirMetin}>
                    <h3 className={styles.kartBaslik}>{baslik}</h3>
                    <p className={styles.acilirAciklama}>{aciklama}</p>
                </div>
                <button
                    type="button"
                    className={styles.acilirDugme}
                    aria-expanded={acik}
                    aria-controls={panelId}
                    onClick={() => onToggle(!acik)}
                >
                    {acik ? 'Kapat' : 'Aç'}
                    <IconChevronRight size={16} className={acik ? styles.acilirOkAcik : styles.acilirOkKapali} />
                </button>
            </div>
            <div id={panelId} hidden={!acik}>
                {acik && children}
            </div>
        </section>
    );
}
