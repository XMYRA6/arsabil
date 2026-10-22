import React from 'react';
import Link from 'next/link';
import styles from './NavPill.module.css';

interface NavPillProps {
    links: { href: string; label: string }[];
    activeHref: string;
    logo: React.ReactNode;
    right?: React.ReactNode;
}

export function NavPill({ links, activeHref, logo, right }: NavPillProps) {
    return (
        <nav aria-label="Ana menü" className={styles.nav}>
            <div className={styles.pill}>
                <Link href="/" aria-label="Ana sayfa" className={styles.logoLink}>
                    {logo}
                </Link>
                <div className={styles.links}>
                    {links.map((link) => {
                        const isActive = activeHref === link.href || activeHref.startsWith(link.href + '/');
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                aria-current={isActive ? 'page' : undefined}
                                className={isActive ? `${styles.link} ${styles.active}` : styles.link}
                            >
                                {link.label}
                            </Link>
                        );
                    })}
                </div>
                {right && <div className={styles.right}>{right}</div>}
            </div>
        </nav>
    );
}
