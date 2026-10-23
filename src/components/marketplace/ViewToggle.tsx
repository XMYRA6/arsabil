"use client";

import styles from './ViewToggle.module.css';

type View = 'split' | 'map' | 'list';

interface Props {
    view: View;
    onChange: (v: View) => void;
}

/**
 * İlanlar / Harita anahtarı — Figma 07 (iki seçenek). Eski "split" görünümü
 * kalktı; URL'de `view=split` kalmış bağlantılar "İlanlar" olarak açılır.
 */
export function ViewToggle({ view, onChange }: Props) {
    const opts: { id: View; label: string }[] = [
        { id: 'list', label: 'İlanlar' },
        { id: 'map', label: 'Harita' },
    ];
    const aktif: View = view === 'map' ? 'map' : 'list';

    return (
        <div className={styles.group} role="group" aria-label="Görünüm">
            {opts.map(o => (
                <button
                    key={o.id}
                    type="button"
                    onClick={() => onChange(o.id)}
                    aria-label={o.label}
                    aria-pressed={aktif === o.id}
                    className={`${styles.btn} ${aktif === o.id ? styles.btnActive : ''}`}
                >
                    {o.label}
                </button>
            ))}
        </div>
    );
}
