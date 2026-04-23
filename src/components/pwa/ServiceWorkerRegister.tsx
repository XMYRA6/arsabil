"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
    useEffect(() => {
        if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
            // Reload the page when the service worker changes
            let refreshing = false;
            navigator.serviceWorker.addEventListener("controllerchange", () => {
                if (!refreshing) {
                    refreshing = true;
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
                .register("/sw.js")
                .then((registration) => {
                    console.log("[ArsaBil] Service Worker kayıtlı.");

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
