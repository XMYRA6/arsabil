import React from 'react';
import styles from './Toggle.module.css';

interface ToggleProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
    label?: string;
    onText?: string;
    offText?: string;
}

export const Toggle: React.FC<ToggleProps> = ({
    label,
    onText,
    offText,
    className = '',
    ...props
}) => {
    return (
        <label className={`${styles.wrapper} ${className}`}>
            {label && <span className={styles.label}>{label}</span>}
            <div className={styles.toggleContainer}>
                {offText && <span className={`${styles.sideText} ${!props.checked ? styles.activeText : ''}`}>{offText}</span>}

                <div className={styles.switch}>
                    <input type="checkbox" className={styles.checkbox} {...props} />
                    <span className={styles.slider}></span>
                </div>

                {onText && <span className={`${styles.sideText} ${props.checked ? styles.activeText : ''}`}>{onText}</span>}
            </div>
        </label>
    );
};
