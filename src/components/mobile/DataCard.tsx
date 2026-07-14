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
    /** Ek CSS class'ı — kök <li>'ye eklenir, `styles.card`'ın YANINA (üzerine yazmaz) */
    className?: string;
}

/**
 * Liste/kart görünümünde tek bir kayıt satırı. `href` verilirse başlık +
 * alanlar tıklanabilir bir bağlantıya dönüşür; `actions` bağlantının
 * DIŞINDA kalır (iç içe link/buton olmaz).
 *
 * @example
 * ```tsx
 * <CardList>
 *   {ilanlar.map((ilan) => (
 *     <DataCard
 *       key={ilan.id}
 *       title={ilan.baslik}
 *       subtitle={ilan.konum}
 *       fields={[{ label: 'Fiyat', value: formatPrice(ilan.fiyat) }]}
 *       href={`/ilan/${ilan.id}`}
 *       actions={<FavoriteButton ilanId={ilan.id} />}
 *     />
 *   ))}
 * </CardList>
 * ```
 */
export function DataCard({ title, subtitle, fields = [], actions, href, className }: DataCardProps) {
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
        <li className={`${styles.card}${className ? ` ${className}` : ""}`}>
            {href ? <Link href={href} className={styles.link}>{body}</Link> : body}
            {actions && <div className={styles.actions}>{actions}</div>}
        </li>
    );
}

/**
 * `DataCard` öğelerini saran `<ul>` listesi.
 *
 * @example
 * ```tsx
 * <CardList>
 *   <DataCard title="İlan 1" href="/ilan/1" />
 * </CardList>
 * ```
 */
export function CardList({ children }: { children: React.ReactNode }) {
    return <ul className={styles.list}>{children}</ul>;
}
