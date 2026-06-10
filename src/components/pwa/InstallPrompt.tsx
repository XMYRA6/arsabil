"use client";

import { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showBanner, setShowBanner] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isAndroidManual, setIsAndroidManual] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);

    useEffect(() => {
        // Check if already dismissed
        const dismissed = localStorage.getItem("arsabil-install-dismissed");
        if (dismissed) return;

        // Check if already in standalone mode
        const standalone =
            window.matchMedia("(display-mode: standalone)").matches ||
            (window.navigator as any).standalone === true;
        setIsStandalone(standalone);
        if (standalone) return;

        // Detect platform
        const ua = window.navigator.userAgent;
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);

        // Only show on mobile devices
        if (!isMobile) return;

        const isiOS = /iPad|iPhone|iPod/.test(ua) || (ua.includes("Mac") && "ontouchend" in document);
        setIsIOS(isiOS);

        if (isiOS) {
            const timer = setTimeout(() => setShowBanner(true), 3000);
            return () => clearTimeout(timer);
        }

        // Android / Chrome: listen for beforeinstallprompt
        let promptFired = false;
        const handler = (e: Event) => {
            e.preventDefault();
            promptFired = true;
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            setTimeout(() => setShowBanner(true), 2000);
        };
        window.addEventListener("beforeinstallprompt", handler);

        // Fallback: if on mobile and beforeinstallprompt doesn't fire (HTTP / non-Chrome),
        // show manual instructions after 5 seconds
        const fallbackTimer = setTimeout(() => {
            if (!promptFired && isMobile) {
                setIsAndroidManual(true);
                setShowBanner(true);
            }
        }, 5000);

        return () => {
            window.removeEventListener("beforeinstallprompt", handler);
            clearTimeout(fallbackTimer);
        };
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") {
            setShowBanner(false);
        }
        setDeferredPrompt(null);
    };

    const handleDismiss = () => {
        setShowBanner(false);
        localStorage.setItem("arsabil-install-dismissed", Date.now().toString());
    };

    if (!showBanner || isStandalone) return null;

    return (
        <>
            {/* Backdrop click to dismiss */}
            <div
                onClick={handleDismiss}
                style={{
                    position: "fixed",
                    inset: 0,
                    background: "rgba(0,0,0,0.3)",
                    zIndex: 9998,
                    animation: "pwafadeIn 0.3s ease",
                }}
            />

            {/* Banner */}
            <div
                style={{
                    position: "fixed",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    zIndex: 9999,
                    padding: "0 16px 16px",
                    animation: "pwaSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
            >
                <div
                    style={{
                        maxWidth: 480,
                        margin: "0 auto",
                        background: "var(--panel, #1a1f2e)",
                        border: "1px solid var(--border, rgba(255,255,255,0.1))",
                        borderRadius: 20,
                        padding: "20px",
                        boxShadow: "0 -8px 40px rgba(0,0,0,0.3)",
                        backdropFilter: "blur(20px)",
                    }}
                >
                    {/* Header with icon */}
                    <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
                        <img
                            src="/icons/icon-192x192.png"
                            alt="ArsaBil"
                            style={{
                                width: 52,
                                height: 52,
                                borderRadius: 14,
                                boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                            }}
                        />
                        <div style={{ flex: 1 }}>
                            <div
                                style={{
                                    fontWeight: 800,
                                    fontSize: "1.05rem",
                                    color: "var(--card-title, #fff)",
                                    marginBottom: 2,
                                }}
                            >
                                ArsaBil Uygulaması
                            </div>
                            <div style={{ fontSize: "0.78rem", color: "var(--muted, #999)", lineHeight: 1.4 }}>
                                Hızlı erişim için ana ekranınıza ekleyin
                            </div>
                        </div>

                        {/* Close button */}
                        <button
                            onClick={handleDismiss}
                            style={{
                                width: 32,
                                height: 32,
                                borderRadius: 10,
                                border: "1px solid var(--border, rgba(255,255,255,0.1))",
                                background: "transparent",
                                color: "var(--muted, #999)",
                                fontSize: "1.1rem",
                                cursor: "pointer",
                                display: "grid",
                                placeItems: "center",
                                flexShrink: 0,
                            }}
                        >
                            ✕
                        </button>
                    </div>

                    {/* Features */}
                    <div
                        style={{
                            display: "flex",
                            gap: 8,
                            marginBottom: 16,
                            flexWrap: "wrap",
                        }}
                    >
                        {["⚡ Anında Açılış", "📱 Tam Ekran", "📊 Offline Erişim"].map((f) => (
                            <span
                                key={f}
                                style={{
                                    fontSize: "0.7rem",
                                    fontWeight: 700,
                                    padding: "4px 10px",
                                    borderRadius: 8,
                                    background: "rgba(var(--primary-rgb), 0.1)",
                                    color: "var(--primary, #6d5bf6)",
                                    border: "1px solid rgba(var(--primary-rgb), 0.2)",
                                }}
                            >
                                {f}
                            </span>
                        ))}
                    </div>

                    {isIOS ? (
                        /* iOS Instructions */
                        <div
                            style={{
                                background: "rgba(var(--primary-rgb), 0.06)",
                                borderRadius: 14,
                                padding: "14px 16px",
                                border: "1px solid rgba(var(--primary-rgb), 0.12)",
                            }}
                        >
                            <div
                                style={{
                                    fontSize: "0.82rem",
                                    fontWeight: 700,
                                    color: "var(--card-title, #fff)",
                                    marginBottom: 8,
                                }}
                            >
                                Ana Ekrana Ekleme
                            </div>
                            <div style={{ fontSize: "0.78rem", color: "var(--muted, #999)", lineHeight: 1.6 }}>
                                1. Safari alt menüsünde{" "}
                                <span
                                    style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: 4,
                                        background: "rgba(255,255,255,0.1)",
                                        padding: "2px 8px",
                                        borderRadius: 6,
                                        fontWeight: 700,
                                        color: "var(--primary, #6d5bf6)",
                                    }}
                                >
                                    ⬆️ Paylaş
                                </span>{" "}
                                butonuna dokunun
                                <br />
                                2.{" "}
                                <span style={{ fontWeight: 700, color: "var(--card-title, #fff)" }}>
                                    "Ana Ekrana Ekle"
                                </span>{" "}
                                seçeneğini seçin
                            </div>
                        </div>
                    ) : (
                        /* Android Install Button */
                        <button
                            onClick={handleInstall}
                            style={{
                                width: "100%",
                                padding: "14px",
                                borderRadius: 14,
                                border: "none",
                                background: "linear-gradient(135deg, var(--primary, #6d5bf6), var(--primary-2, #3b82f6))",
                                color: "white",
                                fontSize: "0.95rem",
                                fontWeight: 800,
                                cursor: "pointer",
                                boxShadow: "0 4px 16px rgba(var(--primary-rgb), 0.3)",
                                transition: "all 0.2s ease",
                                fontFamily: "inherit",
                            }}
                        >
                            📲 Uygulamayı Yükle
                        </button>
                    )}
                </div>
            </div>

            <style
                dangerouslySetInnerHTML={{
                    __html: `
            @keyframes pwaSlideUp {
              from { transform: translateY(100%); opacity: 0; }
              to { transform: translateY(0); opacity: 1; }
            }
            @keyframes pwafadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
          `,
                }}
            />
        </>
    );
}
