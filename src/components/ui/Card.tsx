import React from 'react';
import styles from './Card.module.css';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    title?: string;
    variant?: 'glass' | 'accent' | 'flat';
}

export const Card: React.FC<CardProps> = ({ children, className = '', title, variant = 'glass' }) => {
    return (
        <div className={`${styles.card} ${styles[variant]} ${className}`}>
            {title && <h3 className={styles.cardTitle}>{title}</h3>}
            <div className={styles.cardContent}>
                {children}
            </div>
        </div>
    );
};
