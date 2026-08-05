"use client";

import React, { useEffect, useRef, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useDragControls, useReducedMotion } from 'framer-motion';
import styles from './BottomSheet.module.css';

interface BottomSheetProps {
    open: boolean;
    onClose: () => void;
    title?: string;
    /** Ek CSS sinifi — `.sheet` elemanina eklenir. Varsayilan davranis degismez. */
    className?: string;
    children: React.ReactNode;
}

const DEFAULT_ARIA_LABEL = 'Alt panel';

const noopSubscribe = () => () => {};

/**
 * Yaprak acilis/kapanis gecisi. `initial`/`animate` reduced motion'da
 * eksen (y) yerine yalnizca opacity'e duser ama bu TEK BASINA yetmez:
 * `transition` ayri bir prop ve spring olarak sabit kalirsa opacity
 * fade'i yine sureli calisir — canli olcumle yakalandi (Task 10):
 * `prefers-reduced-motion: reduce` altinda bile `getAnimations()` acilistan
 * 100ms sonra playState:'running', duration:400 donduruyordu. Plan kisiti
 * "tum hareket kapali" sure icin de gecerli, bu yuzden reduced motion'da
 * sifir sureli (aninda) gecis donuyor.
 */
export function sheetTransition(reduceMotion: boolean) {
    return reduceMotion
        ? { duration: 0 }
        : { type: 'spring' as const, damping: 32, stiffness: 320 };
}

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
export function BottomSheet({ open, onClose, title, className, children }: BottomSheetProps) {
    const reduceMotion = useReducedMotion();
    const dragControls = useDragControls();
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
                        transition={sheetTransition(reduceMotion ?? false)}
                        onClick={onClose}
                        aria-hidden="true"
                    />
                    <motion.div
                        ref={sheetRef}
                        tabIndex={-1}
                        role="dialog"
                        aria-modal="true"
                        aria-label={title || DEFAULT_ARIA_LABEL}
                        className={`${styles.sheet} ${className || ''}`}
                        initial={reduceMotion ? { opacity: 0 } : { y: '100%' }}
                        animate={reduceMotion ? { opacity: 1 } : { y: 0 }}
                        exit={reduceMotion ? { opacity: 0 } : { y: '100%' }}
                        transition={sheetTransition(reduceMotion ?? false)}
                        drag={reduceMotion ? false : 'y'}
                        /* KRITIK: `dragListener={false}` + `dragControls`.
                           Varsayilan halinde framer-motion `drag="y"` icin
                           yaprak kokune `touch-action: pan-x` koyuyor ve
                           ALTINDAKI HER SEYIN dikey kaydirmasini olduruyor —
                           `.content { overflow-y: auto }` olsa bile. Uzun
                           icerikli yapraklarda (4f: 1129px icerik / 652px
                           gorunur) alt 477px'e, yani haritaya, risk kartina
                           ve Uygula/Sifirla butonlarina parmakla ulasilamiyordu.
                           Suruklemeyi yalnizca tutamak baslatir; govde normal
                           kaydirilir. */
                        dragListener={false}
                        dragControls={dragControls}
                        dragConstraints={{ top: 0 }}
                        dragElastic={{ top: 0, bottom: 0.4 }}
                        onDragEnd={(_, info) => {
                            if (info.offset.y > 120 || info.velocity.y > 800) onClose();
                        }}
                    >
                        <div
                            className={styles.grabber}
                            aria-hidden="true"
                            onPointerDown={e => { if (!reduceMotion) dragControls.start(e); }}
                        />
                        {title && <div className={styles.title}>{title}</div>}
                        <div className={styles.content}>{children}</div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>,
        document.body
    );
}
