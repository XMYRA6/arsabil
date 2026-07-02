import React from 'react';
import styles from './StickyActionBar.module.css';

interface StickyActionBarProps {
    children: React.ReactNode;
    /** BottomNavbar'ın göründüğü sayfalarda true — çubuk navbar'ın üstüne oturur */
    aboveBottomNav?: boolean;
}

export function StickyActionBar({ children, aboveBottomNav = false }: StickyActionBarProps) {
    return (
        <div className={`${styles.bar} ${aboveBottomNav ? styles.aboveNav : ''}`}>
            {children}
        </div>
    );
}
