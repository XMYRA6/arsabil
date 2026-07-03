"use client";

import React, { useEffect, useRef, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import styles from './BottomSheet.module.css';

interface BottomSheetProps {
    open: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
}

const DEFAULT_ARIA_LABEL = 'Alt panel';

const noopSubscribe = () => () => {};

/**
 * SSR'de `false`, client'ta ilk render sonrası `true` döner. Portal hedefi
 * `document.body` sadece client'ta var olduğundan gerekli — effect içinde
 * setState yapmak yerine `useSyncExternalStore` ile senkronize edilir.
 */
function useIsMounted() {
    return useSyncExternalStore(
        noopSubscribe,
        () => true,
        () => false
    );
}

/**
 * Alttan açılan, sürükle-kapat destekli modal panel. `document.body`
 * altına portallanır (aria-modal katman her zaman en üstte durur, ata
 * elemanlardaki transform/backdrop-filter'dan etkilenmez).
 *
 * @example
 * ```tsx
 * const [open, setOpen] = useState(false);
 * <BottomSheet open={open} onClose={() => setOpen(false)} title="Filtreler">
 *   <FilterForm onSubmit={() => setOpen(false)} />
 * </BottomSheet>
 * ```
 */
export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
    const reduceMotion = useReducedMotion();
    const mounted = useIsMounted();
    const sheetRef = useRef<HTMLDivElement>(null);
    const previousFocusRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKey);
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = prevOverflow;
        };
    }, [open, onClose]);

    // Minimal odak yönetimi: açılışta tetikleyiciyi hatırla ve odağı panele
    // taşı; kapanışta odağı tetikleyiciye geri döndür (tam bir focus trap
    // değil — sadece giriş/çıkış odağı).
    useEffect(() => {
        if (open) {
            previousFocusRef.current = document.activeElement as HTMLElement | null;
            sheetRef.current?.focus();
        } else if (previousFocusRef.current) {
            const el = previousFocusRef.current;
            previousFocusRef.current = null;
            if (document.contains(el)) el.focus();
        }
    }, [open]);

    if (!mounted) return null;

    return createPortal(
        <AnimatePresence>
            {open && (
                <>
                    <motion.div
                        data-testid="bottomsheet-backdrop"
                        className={styles.backdrop}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        aria-hidden="true"
                    />
                    <motion.div
                        ref={sheetRef}
                        tabIndex={-1}
                        role="dialog"
                        aria-modal="true"
                        aria-label={title || DEFAULT_ARIA_LABEL}
                        className={styles.sheet}
                        initial={reduceMotion ? { opacity: 0 } : { y: '100%' }}
                        animate={reduceMotion ? { opacity: 1 } : { y: 0 }}
                        exit={reduceMotion ? { opacity: 0 } : { y: '100%' }}
                        transition={{ type: 'spring', damping: 32, stiffness: 320 }}
                        drag={reduceMotion ? false : 'y'}
                        dragConstraints={{ top: 0 }}
                        dragElastic={{ top: 0, bottom: 0.4 }}
                        onDragEnd={(_, info) => {
                            if (info.offset.y > 120 || info.velocity.y > 800) onClose();
                        }}
                    >
                        <div className={styles.grabber} aria-hidden="true" />
                        {title && <div className={styles.title}>{title}</div>}
                        <div className={styles.content}>{children}</div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>,
        document.body
    );
}
