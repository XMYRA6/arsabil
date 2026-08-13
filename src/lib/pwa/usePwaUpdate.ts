"use client";

import { useEffect, useState } from 'react';

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
            navigator.serviceWorker.getRegistration() as Promise<PwaUpdateRegistration | undefined>,
        hasController: () => navigator.serviceWorker.controller !== null,
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

export function usePwaUpdate(
    target: PwaUpdateTarget = createBrowserPwaUpdateTarget()
): UsePwaUpdateResult {
    const [waitingWorker, setWaitingWorker] = useState<PwaUpdateWorker | null>(null);

    useEffect(() => {
        let cancelled = false;
        let reg: PwaUpdateRegistration | undefined;

        const onUpdateFound = () => {
            const installing = reg?.installing;
            if (!installing) return;
            const onStateChange = () => {
                if (installing.state === 'installed' && target.hasController()) {
                    setWaitingWorker(installing);
                }
                installing.removeEventListener('statechange', onStateChange);
            };
            installing.addEventListener('statechange', onStateChange);
        };

        target.getRegistration().then((r) => {
            if (cancelled || !r) return;
            reg = r;
            if (r.waiting && target.hasController()) {
                setWaitingWorker(r.waiting);
            }
            r.addEventListener('updatefound', onUpdateFound);
        });

        return () => {
            cancelled = true;
            reg?.removeEventListener('updatefound', onUpdateFound);
        };
    }, [target]);

    const applyUpdate = () => {
        if (!waitingWorker) return;
        const onControllerChange = () => {
            target.removeControllerChangeListener(onControllerChange);
            target.reload();
        };
        target.addControllerChangeListener(onControllerChange);
        waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    };

    return { updateAvailable: waitingWorker !== null, applyUpdate };
}
