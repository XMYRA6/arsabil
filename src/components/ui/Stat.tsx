import React from 'react';
import styles from './Stat.module.css';

interface StatProps {
    label: string;
    value: React.ReactNode;
    unit?: string;
    hint?: string;
    tone?: 'neutral' | 'ok' | 'bad';
    className?: string;
}

export function Stat({ label, value, unit, hint, tone = 'neutral', className = '' }: StatProps) {
    return (
        <dl className={`${styles.stat} ${className}`}>
            <dt className={styles.label}>{label}</dt>
            <dd className={styles.valueWrap}>
                <span className={`${styles.value} ${styles[tone]}`}>{value}</span>
                {unit && <span data-testid="stat-unit" className={styles.unit}>{unit}</span>}
            </dd>
            {hint && <p data-testid="stat-hint" className={styles.hint}>{hint}</p>}
        </dl>
    );
}
