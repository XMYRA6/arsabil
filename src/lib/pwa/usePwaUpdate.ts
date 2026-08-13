"use client";

import { useEffect, useMemo, useState } from 'react';

/**
 * `usePwaUpdate` ihtiyaç duydugu tum tarayici API'lerini bu arayuz uzerinden
 * alir — jsdom `navigator.serviceWorker`i desteklemedigi icin testler sahte
 * bir target enjekte eder (bkz. `chunkErrorReload.ts`teki ayni desen).
 */
export interface PwaUpdateWorker {
    state: string;
    postMessage: (message: { type: string }) => void;
    addEventListener: (type: 'statechange', listener: () => void) => void;
    removeEventListener: (type: 'statechange', listener: () => void) => void;
}

export interface PwaUpdateRegistration {
    waiting: PwaUpdateWorker | null;
    installing: PwaUpdateWorker | null;
    addEventListener: (type: 'updatefound', listener: () => void) => void;
    removeEventListener: (type: 'updatefound', listener: () => void) => void;
}

export interface PwaUpdateTarget {
    getRegistration: () => Promise<PwaUpdateRegistration | undefined>;
    hasController: () => boolean;
    addControllerChangeListener: (listener: () => void) => void;
    removeControllerChangeListener: (listener: () => void) => void;
    reload: () => void;
}

export function createBrowserPwaUpdateTarget(): PwaUpdateTarget {
    return {
        getRegistration: () =>
            typeof navigator !== 'undefined' && 'serviceWorker' in navigator
                ? (navigator.serviceWorker.getRegistration() as Promise<PwaUpdateRegistration | undefined>)
                : Promise.resolve(undefined),
        hasController: () =>
            typeof navigator !== 'undefined' && 'serviceWorker' in navigator
                ? navigator.serviceWorker.controller !== null
                : false,
        addControllerChangeListener: (listener) =>
            navigator.serviceWorker.addEventListener('controllerchange', listener),
        removeControllerChangeListener: (listener) =>
            navigator.serviceWorker.removeEventListener('controllerchange', listener),
        reload: () => window.location.reload(),
    };
}

export interface UsePwaUpdateResult {
    updateAvailable: boolean;
    applyUpdate: () => void;
}

export function usePwaUpdate(target?: PwaUpdateTarget): UsePwaUpdateResult {
    // `target` parametre olarak verilmezse varsayilan hedef HER render'da
    // yeniden olusturulmamasi icin burada memoize edilir — aksi halde asagidaki
    // useEffect'in bagimlilik dizisi ([resolvedTarget]) her render'da degisir ve
    // 'updatefound' aboneligi surekli sokulup yeniden kurulur (bkz. final review).
    const resolvedTarget = useMemo(() => target ?? createBrowserPwaUpdateTarget(), [target]);
    const [waitingWorker, setWaitingWorker] = useState<PwaUpdateWorker | null>(null);

    useEffect(() => {
        let cancelled = false;
        let reg: PwaUpdateRegistration | undefined;
        let installingWorker: PwaUpdateWorker | undefined;
        let onStateChange: (() => void) | undefined;

        const onUpdateFound = () => {
            if (cancelled) return;
            installingWorker = reg?.installing ?? undefined;
            if (!installingWorker) return;
            onStateChange = () => {
                if (cancelled) return;
                if (installingWorker!.state === 'installed' && resolvedTarget.hasController()) {
                    setWaitingWorker(installingWorker!);
                }
                installingWorker!.removeEventListener('statechange', onStateChange!);
            };
            installingWorker.addEventListener('statechange', onStateChange);
        };

        resolvedTarget
            .getRegistration()
            .then((r) => {
                if (cancelled || !r) return;
                reg = r;
                if (r.waiting && resolvedTarget.hasController()) {
                    setWaitingWorker(r.waiting);
                }
                r.addEventListener('updatefound', onUpdateFound);
            })
            .catch(() => {
                // Desteklenmeyen tarayici/guvensiz baglam (orn. SecurityError) —
                // PWA guncelleme altyapisindaki hatalari kullaniciya sizdirmadan
                // sessizce basarisiz ol (bkz. chunkErrorReload.ts'teki ayni yaklasim).
            });

        return () => {
            cancelled = true;
            reg?.removeEventListener('updatefound', onUpdateFound);
            if (installingWorker && onStateChange) {
                installingWorker.removeEventListener('statechange', onStateChange);
            }
        };
    }, [resolvedTarget]);

    const applyUpdate = () => {
        if (!waitingWorker) return;
        let settled = false;
        const onControllerChange = () => {
            if (settled) return;
            settled = true;
            clearTimeout(fallbackTimer);
            resolvedTarget.removeControllerChangeListener(onControllerChange);
            resolvedTarget.reload();
        };
        resolvedTarget.addControllerChangeListener(onControllerChange);
        // Baska bir sekme guncellemeyi zaten uygulamis olabilir: bu durumda bu
        // worker `activated`/`redundant` olabilir, postMessage InvalidStateError
        // firlatabilir ve controllerchange bu sekme icin hic tetiklenmeyebilir
        // (zaten daha once ateslenmis olabilir). Zaman asimi yedegi, tikin
        // asla sessiz bir no-op olmamasini garanti eder.
        const fallbackTimer = setTimeout(() => {
            if (settled) return;
            settled = true;
            resolvedTarget.removeControllerChangeListener(onControllerChange);
            resolvedTarget.reload();
        }, 3000);
        try {
            waitingWorker.postMessage({ type: 'SKIP_WAITING' });
        } catch {
            // Worker zaten activated/redundant durumda (orn. baska bir sekme
            // guncellemeyi once uyguladi) — controllerchange bu sekme icin hic
            // tetiklenmeyebilir, yukaridaki fallback zamanlayici reload'un yine
            // de gerceklesmesini garanti eder.
        }
    };

    return { updateAvailable: waitingWorker !== null, applyUpdate };
}
