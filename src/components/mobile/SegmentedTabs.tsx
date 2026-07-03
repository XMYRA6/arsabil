"use client";

import React, { useRef } from 'react';
import styles from './SegmentedTabs.module.css';

interface SegmentedTabsProps {
    options: { value: string; label: string }[];
    value: string;
    onChange: (value: string) => void;
    /** Ekran okuyucular için grup etiketi */
    ariaLabel: string;
}

/**
 * Segmented control (tab benzeri görünüm/filtre seçici). WAI-ARIA "roving
 * tabindex" deseni uygular: sadece seçili tab tabIndex=0 taşır, oklarla
 * gezinme seçimi ve odağı birlikte taşır (Home/End uçlara atlar).
 *
 * @example
 * ```tsx
 * <SegmentedTabs
 *   ariaLabel="Görünüm"
 *   options={[{ value: 'liste', label: 'Liste' }, { value: 'harita', label: 'Harita' }]}
 *   value={view}
 *   onChange={setView}
 * />
 * ```
 */
export function SegmentedTabs({ options, value, onChange, ariaLabel }: SegmentedTabsProps) {
    const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

    const moveTo = (index: number) => {
        const next = options[index];
        if (!next) return;
        onChange(next.value);
        tabRefs.current[index]?.focus();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
        switch (e.key) {
            case 'ArrowRight':
                e.preventDefault();
                moveTo((index + 1) % options.length);
                break;
            case 'ArrowLeft':
                e.preventDefault();
                moveTo((index - 1 + options.length) % options.length);
                break;
            case 'Home':
                e.preventDefault();
                moveTo(0);
                break;
            case 'End':
                e.preventDefault();
                moveTo(options.length - 1);
                break;
            default:
                break;
        }
    };

    return (
        <div role="tablist" aria-label={ariaLabel} className={styles.tabs}>
            {options.map((o, i) => (
                <button
                    key={o.value}
                    ref={(el) => { tabRefs.current[i] = el; }}
                    type="button"
                    role="tab"
                    aria-selected={value === o.value}
                    tabIndex={value === o.value ? 0 : -1}
                    className={`${styles.tab} ${value === o.value ? styles.active : ''}`}
                    onClick={() => onChange(o.value)}
                    onKeyDown={(e) => handleKeyDown(e, i)}
                >
                    {o.label}
                </button>
            ))}
        </div>
    );
}
