"use client";

import { useEffect, useRef, useState } from 'react';
import styles from './masaustu.module.css';

export type DahaFazlaOge = {
    etiket: string;
    onClick: () => void;
    disabled?: boolean;
    title?: string;
};

/** Eylem satırında az kullanılan işlemleri toplayan "⋯" menüsü (PDF, hızlı karşılaştırma). */
export function DahaFazlaMenu({ ogeler }: { ogeler: DahaFazlaOge[] }) {
    const [acik, setAcik] = useState(false);
    const kapRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!acik) return;
        const disTik = (e: MouseEvent) => {
            if (kapRef.current && !kapRef.current.contains(e.target as Node)) setAcik(false);
        };
        const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setAcik(false); };
        document.addEventListener('mousedown', disTik);
        document.addEventListener('keydown', esc);
        return () => {
            document.removeEventListener('mousedown', disTik);
            document.removeEventListener('keydown', esc);
        };
    }, [acik]);

    return (
        <div className={styles.dahaFazlaKap} ref={kapRef}>
            <button
                type="button"
                className={styles.eylemIkincil}
                aria-haspopup="menu"
                aria-expanded={acik}
                onClick={() => setAcik(a => !a)}
            >
                Daha fazla
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
            </button>
            {acik && (
                <div className={styles.dahaFazlaMenu} role="menu">
                    {ogeler.map(o => (
                        <button
                            key={o.etiket}
                            type="button"
                            role="menuitem"
                            className={styles.dahaFazlaOge}
                            disabled={o.disabled}
                            title={o.title}
                            onClick={() => { setAcik(false); o.onClick(); }}
                        >
                            {o.etiket}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
