"use client";

import type { ListingFilters } from '@/lib/listing/marketplaceFilters';
import { LISTING_TYPE_GROUPS, isTypeGroupActive, toggleTypeGroup } from '@/lib/listing/marketplaceFilters';
import styles from './FilterSidebar.module.css';

interface Props {
    filters: ListingFilters;
    onChange: (f: ListingFilters) => void;
    totalCount: number;
    /** BottomSheet içinde tam genişlik varyantı (Figma: seçenekler çip olarak) */
    inSheet?: boolean;
    /** "Filtreleri uygula" tıklanınca (sheet'i kapatmak için) */
    onApply?: () => void;
}

const IMAR_OPTS = ['Konut', 'Ticari', 'Karma', 'Tarım'];
const IMAR_VALS = ['KONUT', 'TICARI', 'KARMA', 'TARIM'];

const DEFAULTS: ListingFilters = {
    type: ['KAT_KARSILIGI', 'ORTAKLIK'],
    minSize: 0, maxSize: 1000000,
    imar: [],
    fizibiliteOnly: false, minScore: 10,
};

export function FilterSidebar({ filters, onChange, totalCount, inSheet = false, onApply }: Props) {
    const set = (partial: Partial<ListingFilters>) => onChange({ ...filters, ...partial });

    const toggleImar = (val: string) => {
        const has = filters.imar.includes(val);
        set({ imar: has ? filters.imar.filter(v => v !== val) : [...filters.imar, val] });
    };

    const resetAll = () => onChange({ ...DEFAULTS });

    const check = (label: string, active: boolean, onToggle: () => void) => (
        <label key={label} className={styles.checkRow}>
            <input type="checkbox" checked={active} onChange={onToggle} className={styles.checkBoxInput} />
            <span className={`${styles.checkBox} ${active ? styles.checkBoxActive : ''}`} aria-hidden="true">
                {active && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m5 12 5 5L20 7" />
                    </svg>
                )}
            </span>
            {label}
        </label>
    );

    const chip = (label: string, active: boolean, onToggle: () => void) => (
        <button
            key={label}
            type="button"
            aria-pressed={active}
            onClick={onToggle}
            className={`${styles.chip} ${active ? styles.chipActive : ''}`}
        >
            {label}
        </button>
    );

    return (
        <aside className={`${styles.sidebar} ${inSheet ? styles.inSheet : ''}`} aria-label="Filtreler">
            <div className={styles.header}>
                <h2 className={styles.headerTitle}>Filtreler</h2>
                {!inSheet && (
                    <button type="button" onClick={resetAll} className={styles.clearLink}>Temizle</button>
                )}
            </div>
            <p className={styles.headerCount}>{totalCount.toLocaleString('tr-TR')} ilan bulundu</p>

            <div className={styles.section}>
                <span className={styles.sectionLabel}>İlan tipi</span>
                {inSheet ? (
                    <div className={styles.chipWrap}>
                        {LISTING_TYPE_GROUPS.map(t => chip(t.label, isTypeGroupActive(filters, t.ids), () => onChange(toggleTypeGroup(filters, t.ids))))}
                    </div>
                ) : (
                    LISTING_TYPE_GROUPS.map(t => check(t.label, isTypeGroupActive(filters, t.ids), () => onChange(toggleTypeGroup(filters, t.ids))))
                )}
            </div>

            <div className={styles.section}>
                <span className={styles.sectionLabel}>İmar durumu</span>
                {inSheet ? (
                    <div className={styles.chipWrap}>
                        {IMAR_OPTS.map((label, i) => chip(label, filters.imar.includes(IMAR_VALS[i]), () => toggleImar(IMAR_VALS[i])))}
                    </div>
                ) : (
                    IMAR_OPTS.map((label, i) => check(label, filters.imar.includes(IMAR_VALS[i]), () => toggleImar(IMAR_VALS[i])))
                )}
            </div>

            <div className={styles.section}>
                <span className={styles.sectionLabel}>Arsa boyutu (m²)</span>
                <div className={styles.rangeRow}>
                    <label className={styles.rangeField}>
                        <span className={styles.rangeCaption}>Alan min</span>
                        <input type="number" aria-label="Alan min" value={filters.minSize} onChange={e => set({ minSize: +e.target.value })} className={styles.rangeInput} />
                    </label>
                    <label className={styles.rangeField}>
                        <span className={styles.rangeCaption}>Alan max</span>
                        <input type="number" aria-label="Alan max" value={filters.maxSize} onChange={e => set({ maxSize: +e.target.value })} className={styles.rangeInput} />
                    </label>
                </div>
            </div>

            <div className={styles.section}>
                <div className={styles.toggleRow}>
                    <span className={styles.sectionLabel}>Fizibilite skoru</span>
                    <button
                        type="button"
                        role="switch"
                        aria-checked={filters.fizibiliteOnly}
                        aria-label="Fizibilite Skoru Olanlar"
                        onClick={() => set({ fizibiliteOnly: !filters.fizibiliteOnly })}
                        className={`${styles.toggleTrack} ${filters.fizibiliteOnly ? styles.toggleTrackActive : ''}`}
                    >
                        <span className={`${styles.toggleThumb} ${filters.fizibiliteOnly ? styles.toggleThumbActive : ''}`} />
                    </button>
                </div>
                {filters.fizibiliteOnly && (
                    <div>
                        <div className={styles.scoreHeader}>
                            <span className={styles.scoreLabel}>Min skor</span>
                            <span className={styles.scoreValue}>{filters.minScore}+</span>
                        </div>
                        <input
                            type="range"
                            min={10}
                            max={90}
                            value={filters.minScore}
                            aria-label="Min skor"
                            onChange={e => set({ minScore: +e.target.value })}
                            className={styles.scoreRange}
                            style={{ '--progress': `${((filters.minScore - 10) / 80) * 100}%` } as React.CSSProperties}
                        />
                    </div>
                )}
            </div>

            <div className={styles.footer}>
                {inSheet && (
                    <button type="button" onClick={resetAll} className={styles.resetBtn}>Temizle</button>
                )}
                <button type="button" className={styles.applyBtn} onClick={onApply}>
                    {inSheet ? `${totalCount.toLocaleString('tr-TR')} ilanı göster` : 'Filtreleri uygula'}
                </button>
            </div>
        </aside>
    );
}
