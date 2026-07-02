import React from 'react';
import Link from 'next/link';
import styles from './DataCard.module.css';

export interface DataCardField {
    label: string;
    value: React.ReactNode;
}

interface DataCardProps {
    title: React.ReactNode;
    subtitle?: React.ReactNode;
    fields?: DataCardField[];
    /** Kart altı buton grubu (düzenle/sil vb.) — href linkinin DIŞINDA kalır */
    actions?: React.ReactNode;
    /** Verilirse başlık+alanlar tıklanabilir linke dönüşür */
    href?: string;
}

export function DataCard({ title, subtitle, fields = [], actions, href }: DataCardProps) {
    const body = (
        <>
            <div className={styles.header}>
                <div className={styles.title}>{title}</div>
                {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
            </div>
            {fields.length > 0 && (
                <dl className={styles.fields}>
                    {fields.map((f, i) => (
                        <div key={i} className={styles.field}>
                            <dt className={styles.label}>{f.label}</dt>
                            <dd className={styles.value}>{f.value}</dd>
                        </div>
                    ))}
                </dl>
            )}
        </>
    );

    return (
        <li className={styles.card}>
            {href ? <Link href={href} className={styles.link}>{body}</Link> : body}
            {actions && <div className={styles.actions}>{actions}</div>}
        </li>
    );
}

export function CardList({ children }: { children: React.ReactNode }) {
    return <ul className={styles.list}>{children}</ul>;
}
