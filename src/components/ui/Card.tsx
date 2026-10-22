import React from 'react';
import styles from './Card.module.css';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    title?: string;
    variant?: 'glass' | 'accent' | 'flat';
    padding?: 'none' | 'm' | 'l';
}

export function Card({
    children,
    className = '',
    title,
    variant = 'glass',
    padding = 'm'
}: CardProps) {
    const paddingClass = `pad${padding.charAt(0).toUpperCase()}${padding.slice(1)}`;

    return (
        <div className={`${styles.card} ${styles[variant]} ${styles[paddingClass]} ${className}`}>
            {title && <h3 className={styles.cardTitle}>{title}</h3>}
            <div className={styles.cardContent}>
                {children}
            </div>
        </div>
    );
}
