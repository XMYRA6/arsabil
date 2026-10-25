'use client';

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import styles from './TabBar.module.css';
import { hesaplaGosterge, type TabRect } from './tabIndicator';

interface TabBarProps {
    tabs: { href: string; label: string; icon: React.ReactNode; dot?: boolean }[];
    activeHref: string;
}

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export function TabBar({ tabs, activeHref }: TabBarProps) {
    const navRef = useRef<HTMLElement>(null);
    const [olcum, setOlcum] = useState<{ x: number; width: number; ilk: boolean } | null>(null);
    // Gösterge son ölçümde gizli (aktif sekme yok / ölçülmemiş) muydu: ilk gösterimde kayma yerine anında konumlanır.
    const gizliRef = useRef(true);

    const activeIndex = tabs.findIndex((tab) =>
        tab.href === '/' ? activeHref === '/' : activeHref === tab.href || activeHref.startsWith(tab.href + '/'),
    );
    const tabKey = tabs.map((t) => `${t.href}${t.dot ? '*' : ''}`).join('|');

    const olc = useCallback(() => {
        const nav = navRef.current;
        if (!nav) return;
        const links = Array.from(nav.querySelectorAll<HTMLElement>(':scope > a'));
        const rects: TabRect[] = links.map((el) => ({ left: el.offsetLeft, width: el.offsetWidth }));
        const sonuc = hesaplaGosterge(rects, activeIndex);
        if (!sonuc || sonuc.width <= 0) {
            // Aktif sekme yok ama sekmeler ölçülebiliyor: son konumu koru, gösterge opacity 0 ile gizlenir.
            // Sekmeler ölçülemiyorsa (ör. masaüstünde nav display:none => tüm genişlikler 0) ölçümü
            // geçersiz say; statik .active arka planı geçerli kalır.
            gizliRef.current = true;
            if (!sonuc && rects.some((r) => r.width > 0)) return;
            setOlcum(null);
            return;
        }
        const ilk = gizliRef.current;
        gizliRef.current = false;
        setOlcum((onceki) =>
            onceki && onceki.x === sonuc.x && onceki.width === sonuc.width && onceki.ilk === ilk ? onceki : { ...sonuc, ilk },
        );
    }, [activeIndex]);

    useIsomorphicLayoutEffect(() => {
        olc();
    }, [olc, tabKey]);

    useEffect(() => {
        const nav = navRef.current;
        if (!nav) return;
        if (typeof ResizeObserver !== 'undefined') {
            const ro = new ResizeObserver(() => olc());
            ro.observe(nav);
            Array.from(nav.children).forEach((c) => ro.observe(c));
            return () => ro.disconnect();
        }
        window.addEventListener('resize', olc);
        return () => window.removeEventListener('resize', olc);
    }, [olc, tabKey]);

    const hazir = olcum !== null;

    return (
        <nav
            ref={navRef}
            aria-label="Alt menü"
            className={styles.bar}
            data-gosterge={hazir ? 'hazir' : undefined}
        >
            <span
                aria-hidden="true"
                className={styles.gosterge}
                data-ilk={olcum?.ilk ? 'true' : undefined}
                style={{
                    transform: `translateX(${olcum?.x ?? 0}px)`,
                    width: olcum?.width ?? 0,
                    opacity: activeIndex < 0 || !hazir ? 0 : 1,
                }}
            />
            {tabs.map((tab, i) => {
                const isActive = i === activeIndex;
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
