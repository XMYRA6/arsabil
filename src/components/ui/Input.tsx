import React, { useId } from 'react';
import styles from './Input.module.css';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    icon?: React.ReactNode;
    rightElement?: React.ReactNode;
}

export function Input({
    label,
    error,
    icon,
    rightElement,
    className = '',
    id,
    ...props
}: InputProps) {
    const generatedId = useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;

    return (
        <div className={`${styles.wrapper} ${className}`}>
            {label && <label className={styles.label} htmlFor={inputId}>{label}</label>}
            <div className={styles.inputContainer}>
                {icon && <span className={styles.icon}>{icon}</span>}
                <input
                    id={inputId}
                    className={`${styles.input} ${error ? styles.hasError : ''} ${icon ? styles.withIcon : ''} ${rightElement ? styles.withRightElement : ''}`}
                    aria-invalid={error ? 'true' : undefined}
                    aria-describedby={error ? errorId : undefined}
                    {...props}
                />
                {rightElement && <span className={styles.rightElement}>{rightElement}</span>}
            </div>
            {error && <span id={errorId} role="alert" className={styles.errorText}>{error}</span>}
        </div>
    );
}
