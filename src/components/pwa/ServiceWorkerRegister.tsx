"use client";

import { useEffect } from "react";
import { installChunkErrorReload } from "@/lib/pwa/chunkErrorReload";

export function ServiceWorkerRegister() {
    // controllerchange reload'u yalnızca sekme gizlenince tetiklenir (aşağıda);
    // sekme hiç gizlenmezse (mobilde aktif kullanım) bayat JS bundle bir chunk'ı
    // lazy-import etmeye çalışınca kalıcı olarak bozuk kalır. Bu, o durumu ayrıca
    // ve hemen yakalayıp tek seferlik zorla yeniler.
    useEffect(() => {
        if (process.env.NODE_ENV !== "production") return;
        return installChunkErrorReload();
    }, []);

    // iOS Safari viewport kısıtlarını yok sayıp iki parmakla yakınlaştırır; gesture olaylarını durdur.
    useEffect(() => {
        const block = (e: Event) => e.preventDefault();
        document.addEventListener("gesturestart", block);
        document.addEventListener("gesturechange", block);
        return () => {
            document.removeEventListener("gesturestart", block);
            document.removeEventListener("gesturechange", block);
        };
    }, []);

    useEffect(() => {
        if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
            // Reload the page when the service worker changes
            let refreshing = false;
            // Uygulama yeni açıldığında (kullanıcı henüz bir şey yapmadan) bekleyen sürüm
            // varsa banner beklemeden uygula: aksi halde PWA eski sürümde kalıp kalıp duruyor.
            let autoApply = false;
            const EARLY_MS = 15_000;
            const applyIfEarly = (worker: ServiceWorker | null) => {
                if (worker && performance.now() < EARLY_MS) {
                    autoApply = true;
                    worker.postMessage({ type: "SKIP_WAITING" });
                }
            };
            navigator.serviceWorker.addEventListener("controllerchange", () => {
                if (!refreshing) {
                    refreshing = true;
                    if (autoApply) {
                        window.location.reload();
                        return;
                    }
                    // Eğer sayfa gizliyse hemen yenile, değilse gizlenince yenile (kullanıcıyı bölmemek için)
                    if (document.visibilityState === "hidden") {
                        window.location.reload();
                    } else {
                        const handleVisibilityChange = () => {
                            if (document.visibilityState === "hidden") {
                                window.location.reload();
                                document.removeEventListener("visibilitychange", handleVisibilityChange);
                            }
                        };
                        document.addEventListener("visibilitychange", handleVisibilityChange);
                    }
                }
            });

            navigator.serviceWorker
                .register("/sw.js", { updateViaCache: "none" })
                .then((registration) => {
                    console.log("[ArsaBil] Service Worker kayıtlı.");
                    if (navigator.serviceWorker.controller) applyIfEarly(registration.waiting);
                    registration.update();

                    // Check for updates periodically (every 1 hour)
                    setInterval(() => {
                        registration.update();
                        console.log("[ArsaBil] Periyodik güncelleme kontrolü...");
                    }, 60 * 60 * 1000);

                    // Check for updates when tab becomes visible
                    document.addEventListener("visibilitychange", () => {
                        if (document.visibilityState === "visible") {
                            registration.update();
                            console.log("[ArsaBil] Sekme odağı ile güncelleme kontrolü...");
                        }
                    });

                    // Check for updates on initial load
                    registration.addEventListener("updatefound", () => {
                        const newWorker = registration.installing;
                        if (newWorker) {
                            newWorker.addEventListener("statechange", () => {
                                if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                                    console.log("[ArsaBil] Yeni sürüm indirildi, arka planda güncelleniyor...");
                                    applyIfEarly(newWorker);
                                }
                            });
                        }
                    });
                })
                .catch((err) => {
                    console.error("[ArsaBil] Service Worker kayıt hatası:", err);
                });
        }
    }, []);

    return null;
}
