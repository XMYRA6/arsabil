"use client";

import React, { useEffect, useRef, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useDragControls, useReducedMotion } from 'framer-motion';
import { useKeyboardInset } from './useKeyboardInset';
import styles from './BottomSheet.module.css';

interface BottomSheetProps {
    open: boolean;
    onClose: () => void;
    title?: string;
    /** Ek CSS sinifi — `.sheet` elemanina eklenir. Varsayilan davranis degismez. */
    className?: string;
    /** Bazi mockup'lar (ornegin ParcelVerificationSheet) surukle-kapat
     * tutamaci yerine baslikta bir X butonu gosteriyor. true olunca grabber
     * gizlenir, suruklemeyle kapatma devre disi kalir ve X butonu belirir.
     * Varsayilan false: mevcut grabber + drag-to-dismiss davranisi degismez. */
    showCloseButton?: boolean;
    /** `showCloseButton` ile birlikte kullanilir: X gosterilirken surukleme tutamagi
     * ve suruklemeyle kapatma da korunur (Figma: Hesapla gelismis ayarlar). */
    keepGrabber?: boolean;
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
export function BottomSheet({ open, onClose, title, className, showCloseButton = false, keepGrabber = false, children }: BottomSheetProps) {
    const reduceMotion = useReducedMotion();
    const dragControls = useDragControls();
    const mounted = useIsMounted();
    const sheetRef = useRef<HTMLDivElement>(null);
    const previousFocusRef = useRef<HTMLElement | null>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    // Klavye acilinca sheet'in kendisini klavyenin USTUNE oturtur (bkz.
    // useKeyboardInset.ts) — kullanici bulgusu: klavye acilinca sabit
    // `bottom:0` sheet klavyenin altinda kalip tasarimi bozuyordu.
    const keyboardInset = useKeyboardInset();
    // focusin dinleyicisi mount'ta bir kere kurulur (yalnizca `open`
    // degisiminde yeniden baglanir) — o yuzden guncel keyboardInset'i bir
    // ref'ten okur, stale closure'a dusmez.
    const keyboardInsetRef = useRef(keyboardInset);
    keyboardInsetRef.current = keyboardInset;

    // Kullanici bulgusu: "Elle gir" formunda inputa tiklayip klavye gelince
    // input yukari kaciyor, gorunmuyor. Kok neden (Playwright ile canli
    // olculdu): icerik max-height'e ulasmadigi surece --keyboard-inset
    // yukselince sheet'in YUKSEKLIGI SABIT KALIP TAMAMI klavye kadar yukari
    // kayiyor — ustteki alanlar ekranin disina (negatif y) tasiyor. Odak
    // .content icindeyken hem klavye ilk acildiginda (keyboardInset degisimi)
    // hem klavye acikken baska bir alana gecildiginde (focusin) o alani
    // .content'in kendi scrollTop'uyla gorunur alana geri getirir.
    useEffect(() => {
        if (!open || keyboardInset === 0) return;
        const active = document.activeElement;
        if (active instanceof HTMLElement && contentRef.current?.contains(active)) {
            active.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
    }, [open, keyboardInset]);

    useEffect(() => {
        if (!open) return;
        const content = contentRef.current;
        if (!content) return;
        const onFocusIn = (e: FocusEvent) => {
            if (keyboardInsetRef.current === 0) return;
            const target = e.target;
            if (target instanceof HTMLElement) {
                target.scrollIntoView({ block: 'center', behavior: 'smooth' });
            }
        };
        content.addEventListener('focusin', onFocusIn);
        return () => content.removeEventListener('focusin', onFocusIn);
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKey);
        // Arkadaki sayfa kilitlenir: body + html kaydırması kapanır, böylece panelin
        // dışına/başlığına dokunup sürüklemek sayfayı oynatmaz.
        const prevOverflow = document.body.style.overflow;
        const prevHtmlOverflow = document.documentElement.style.overflow;
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = prevOverflow;
            document.documentElement.style.overflow = prevHtmlOverflow;
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
                        style={{ '--keyboard-inset': `${keyboardInset}px` } as React.CSSProperties}
                        initial={reduceMotion ? { opacity: 0 } : { y: '100%' }}
                        animate={reduceMotion ? { opacity: 1 } : { y: 0 }}
                        exit={reduceMotion ? { opacity: 0 } : { y: '100%' }}
                        transition={sheetTransition(reduceMotion ?? false)}
                        drag={reduceMotion || (showCloseButton && !keepGrabber) ? false : 'y'}
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
                        {/* Sürükleme bölgesi: tutamaç + başlık satırı. `touch-action: none` ile
                            tarayıcı bu bölgedeki dikey hareketi sayfa kaydırması olarak ALMAZ;
                            hareket yalnızca paneli kapatır (arkadaki sayfa sürüklenmez). */}
                        {(!showCloseButton || keepGrabber) && (
                            <div
                                className={styles.dragZone}
                                data-testid="bottomsheet-dragzone"
                                onPointerDown={e => { if (!reduceMotion) dragControls.start(e); }}
                            >
                                <div className={styles.grabber} aria-hidden="true" />
                            </div>
                        )}
                        {showCloseButton ? (
                            <div
                                className={`${styles.titleRow} ${keepGrabber ? styles.dragZoneRow : ''}`}
                                onPointerDown={e => {
                                    if (reduceMotion || !keepGrabber) return;
                                    if ((e.target as HTMLElement).closest('button')) return;
                                    dragControls.start(e);
                                }}
                            >
                                {title && <span className={styles.titleText}>{title}</span>}
                                <button
                                    type="button"
                                    className={styles.closeBtn}
                                    onClick={onClose}
                                    aria-label="Kapat"
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                    </svg>
                                </button>
                            </div>
                        ) : (
                            title && <div className={styles.title}>{title}</div>
                        )}
                        <div ref={contentRef} className={styles.content}>{children}</div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>,
        document.body
    );
}
