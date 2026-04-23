import React from 'react';
import styles from './Input.module.css';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    icon?: React.ReactNode;
    rightElement?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
    label,
    error,
    icon,
    rightElement,
    className = '',
    ...props
}) => {
    return (
        <div className={`${styles.wrapper} ${className}`}>
            {label && <label className={styles.label}>{label}</label>}
            <div className={styles.inputContainer}>
                {icon && <span className={styles.icon}>{icon}</span>}
                <input
                    className={`${styles.input} ${error ? styles.hasError : ''} ${icon ? styles.withIcon : ''} ${rightElement ? styles.withRightElement : ''}`}
                    {...props}
                />
                {rightElement && <span className={styles.rightElement}>{rightElement}</span>}
            </div>
            {error && <span className={styles.errorText}>{error}</span>}
        </div>
    );
};
