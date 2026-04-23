import React from 'react';
import styles from './Button.module.css';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
    fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
    children,
    variant = 'primary',
    fullWidth = false,
    className = '',
    ...props
}) => {
    const btnClass = `${styles.button} ${styles[variant]} ${fullWidth ? styles.fullWidth : ''} ${className}`;

    return (
        <button className={btnClass} {...props}>
            {children}
        </button>
    );
};
