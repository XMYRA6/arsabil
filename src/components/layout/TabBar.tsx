import React from 'react';
import Link from 'next/link';
import styles from './TabBar.module.css';

interface TabBarProps {
    tabs: { href: string; label: string; icon: React.ReactNode; dot?: boolean }[];
    activeHref: string;
}

export function TabBar({ tabs, activeHref }: TabBarProps) {
    return (
        <nav aria-label="Alt menü" className={styles.bar}>
            {tabs.map((tab) => {
                const isActive = tab.href === '/' ? activeHref === '/' : activeHref === tab.href || activeHref.startsWith(tab.href + '/');
                return (
                    <Link
                        key={tab.href}
                        href={tab.href}
                        aria-current={isActive ? 'page' : undefined}
                        className={`${styles.tab} ${isActive ? styles.active : ''}`}
                    >
                        <span aria-hidden="true" className={styles.icon}>
                            {tab.icon}
                            {tab.dot && <span className={styles.dot} />}
                        </span>
                        <span className={styles.label}>{tab.label}</span>
                        {tab.dot && <span className={styles.srOnly}>Okunmamış bildirim var</span>}
                    </Link>
                );
            })}
        </nav>
    );
}
