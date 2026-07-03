"use client";

import React, { useRef, useState } from 'react';
import styles from './SwipeGallery.module.css';

interface SwipeGalleryProps {
    images: string[];
    /** Alt metin tabanı; "alt 1/3" biçiminde numaralanır */
    alt: string;
}

export function SwipeGallery({ images, alt }: SwipeGalleryProps) {
    const trackRef = useRef<HTMLDivElement>(null);
    const [index, setIndex] = useState(0);

    const onScroll = () => {
        const el = trackRef.current;
        if (!el || el.clientWidth === 0) return;
        setIndex(Math.round(el.scrollLeft / el.clientWidth));
    };

    if (images.length === 0) return null;

    return (
        <div className={styles.gallery}>
            <div className={styles.track} ref={trackRef} onScroll={onScroll}>
                {images.map((src, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        key={`${src}-${i}`}
                        src={src}
                        alt={`${alt} ${i + 1}/${images.length}`}
                        className={styles.slide}
                        loading={i === 0 ? 'eager' : 'lazy'}
                    />
                ))}
            </div>
            {images.length > 1 && (
                <div className={styles.dots} aria-hidden="true">
                    {images.map((_, i) => (
                        <span key={i} data-dot className={`${styles.dot} ${i === index ? styles.dotActive : ''}`} />
                    ))}
                </div>
            )}
        </div>
    );
}
