import React from 'react';
import styles from './PageShell.module.css';

interface PageShellProps {
    children: React.ReactNode;
    className?: string;
    /** true: yatay padding'siz tam genişlik (harita/chat gibi edge-to-edge sayfalar) */
    flush?: boolean;
}

export const PageShell: React.FC<PageShellProps> = ({ children, className = '', flush = false }) => {
    return (
        <div className={`${styles.shell} ${flush ? styles.flush : ''} ${className}`}>
            {children}
        </div>
    );
};
