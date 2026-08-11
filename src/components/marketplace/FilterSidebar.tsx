"use client";

import type { ListingFilters } from '@/lib/listing/marketplaceFilters';
import styles from './FilterSidebar.module.css';

interface Props {
    filters: ListingFilters;
    onChange: (f: ListingFilters) => void;
    totalCount: number;
    /** BottomSheet içinde tam genişlik varyantı */
    inSheet?: boolean;
    /** "Filtreleri Uygula" tıklanınca (sheet'i kapatmak için) */
    onApply?: () => void;
}

const TYPES = [
    { key: 'SALE', ids: ['SALE'], label: 'Satış' },
    { key: 'KAT_KARSILIGI', ids: ['KAT_KARSILIGI', 'ORTAKLIK'], label: 'Kat Karşılığı / Ortaklık' },
];

const IMAR_OPTS = ['Konut', 'Ticari', 'Karma', 'Tarım'];
const IMAR_VALS = ['KONUT', 'TICARI', 'KARMA', 'TARIM'];

export function FilterSidebar({ filters, onChange, totalCount, inSheet = false, onApply }: Props) {
    const set = (partial: Partial<ListingFilters>) => onChange({ ...filters, ...partial });

    const toggleType = (ids: string[]) => {
        const allActive = ids.every(id => filters.type.includes(id));
        set({
            type: allActive
                ? filters.type.filter(t => !ids.includes(t))
                : [...filters.type, ...ids.filter(id => !filters.type.includes(id))],
        });
    };

    const toggleImar = (val: string) => {
        const has = filters.imar.includes(val);
        set({ imar: has ? filters.imar.filter(v => v !== val) : [...filters.imar, val] });
    };

    const resetAll = () => onChange({
        type: ['KAT_KARSILIGI', 'ORTAKLIK'],
        minSize: 0, maxSize: 1000000,
        imar: [],
        fizibiliteOnly: false, minScore: 10,
    });

    return (
        <aside className={`${styles.sidebar} ${inSheet ? styles.inSheet : ''}`}>
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.headerTitle}>Arsa İlanları</div>
                <div className={styles.headerCount}>{totalCount.toLocaleString('tr-TR')} ilan bulundu</div>
            </div>

            {/* Satış Türü */}
            <div className={styles.section}>
                <span className={styles.sectionLabel}>SATIŞ TÜRÜ</span>
                {TYPES.map(t => {
                    const active = t.ids.every(id => filters.type.includes(id));
                    return (
                        <label key={t.key} className={styles.checkRow}>
                            <div
                                onClick={() => toggleType(t.ids)}
                                className={`${styles.checkBox} ${active ? styles.checkBoxActive : ''}`}
                            >
                                {active && <span className={styles.checkMark}>✓</span>}
                            </div>
                            {t.label}
                        </label>
                    );
                })}
            </div>

            {/* Arsa Boyutu */}
            <div className={styles.section}>
                <span className={styles.sectionLabel}>ARSA BOYUTU (m²)</span>
                <div className={styles.rangeRow}>
                    <input type="number" value={filters.minSize} onChange={e => set({ minSize: +e.target.value })} className={styles.rangeInput} />
                    <span className={styles.rangeDash}>–</span>
                    <input type="number" value={filters.maxSize} onChange={e => set({ maxSize: +e.target.value })} className={styles.rangeInput} />
                </div>
            </div>

            {/* İmar Durumu */}
            <div className={styles.section}>
                <span className={styles.sectionLabel}>İMAR DURUMU</span>
                <div className={styles.chipWrap}>
                    {IMAR_OPTS.map((label, i) => {
                        const val = IMAR_VALS[i];
                        const active = filters.imar.includes(val);
                        return (
                            <button
                                key={val}
                                onClick={() => toggleImar(val)}
                                className={`${styles.chip} ${active ? styles.chipActive : ''}`}
                            >{label}</button>
                        );
                    })}
                </div>
            </div>

            {/* Fizibilite */}
            <div className={styles.section}>
                <span className={styles.sectionLabel}>FİZİBİLİTE</span>
                <label className={styles.toggleRow}>
                    <div
                        onClick={() => set({ fizibiliteOnly: !filters.fizibiliteOnly })}
                        className={`${styles.toggleTrack} ${filters.fizibiliteOnly ? styles.toggleTrackActive : ''}`}
                    >
                        <div className={`${styles.toggleThumb} ${filters.fizibiliteOnly ? styles.toggleThumbActive : ''}`} />
                    </div>
                    <span className={styles.toggleLabel}>Fizibilite Skoru Olanlar</span>
                </label>
                {filters.fizibiliteOnly && (
                    <div>
                        <div className={styles.scoreHeader}>
                            <span className={styles.scoreLabel}>Min Skor</span>
                            <span className={styles.scoreValue}>{filters.minScore}+</span>
                        </div>
                        <input type="range" min={10} max={90} value={filters.minScore} onChange={e => set({ minScore: +e.target.value })}
                            className={styles.scoreRange} />
                    </div>
                )}
            </div>

            {/* Buttons */}
            <div className={styles.footer}>
                <button className={styles.applyBtn} onClick={onApply}>Filtreleri Uygula</button>
                <button onClick={resetAll} className={styles.resetBtn}>Tümünü Sıfırla</button>
            </div>
        </aside>
    );
}
