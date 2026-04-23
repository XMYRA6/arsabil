import React from 'react';
import styles from './RangeSlider.module.css';

interface RangeSliderProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    min: number;
    max: number;
    value: number;
    step?: number;
    unit?: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const RangeSlider: React.FC<RangeSliderProps> = ({
    label,
    min,
    max,
    value,
    step = 1,
    unit = '%',
    onChange,
    className = '',
    ...props
}) => {
    const percentage = ((value - min) / (max - min)) * 100;

    return (
        <div className={`${styles.wrapper} ${className}`}>
            {label && (
                <div className={styles.header}>
                    <label className={styles.label}>{label}</label>
                    <span className={styles.valueDisplay}>
                        {unit !== '%' && unit} {value}{unit === '%' && ` ${unit}`}
                    </span>
                </div>
            )}
            <div className={styles.sliderContainer}>
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    onChange={onChange}
                    className={styles.slider}
                    style={{ "--progress": `${percentage}%` } as React.CSSProperties}
                    {...props}
                />
                <div className={styles.ticks}>
                    <span>{min}{unit === '%' && '%'}</span>
                    <span>{max}{unit === '%' && '%'}</span>
                </div>
            </div>
        </div>
    );
};
