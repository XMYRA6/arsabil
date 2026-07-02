"use client";

import React from 'react';
import styles from './SegmentedTabs.module.css';

interface SegmentedTabsProps {
    options: { value: string; label: string }[];
    value: string;
    onChange: (value: string) => void;
    /** Ekran okuyucular için grup etiketi */
    ariaLabel: string;
}

export function SegmentedTabs({ options, value, onChange, ariaLabel }: SegmentedTabsProps) {
    return (
        <div role="tablist" aria-label={ariaLabel} className={styles.tabs}>
            {options.map((o) => (
                <button
                    key={o.value}
                    type="button"
                    role="tab"
                    aria-selected={value === o.value}
                    className={`${styles.tab} ${value === o.value ? styles.active : ''}`}
                    onClick={() => onChange(o.value)}
                >
                    {o.label}
                </button>
            ))}
        </div>
    );
}
