"use client";

import { useState } from "react";
import { usePwaUpdate } from "@/lib/pwa/usePwaUpdate";

/**
 * `InstallPrompt.tsx` ile ayni gorsel dil (panel/blur/rounded, ayni
 * var(--*) token'lari) ama tek-satir daha sade bir bildirim — backdrop
 * yok, kullaniciyi bloke etmiyor. Kapatma yalnizca BU gorunumu gizler,
 * `InstallPrompt`in aksine kalici bir localStorage bayragi YAZILMAZ:
 * her yeni SW guncellemesi ayri bir olay, kullanici bir oncekini kapatmis
 * olsa bile bir sonrakini gormeli (bkz. spec).
 */
export function UpdateBanner() {
    const { updateAvailable, applyUpdate } = usePwaUpdate();
    const [dismissed, setDismissed] = useState(false);

    if (!updateAvailable || dismissed) return null;

    return (
        <div
            style={{
                position: "fixed",
                bottom: 16,
                left: 16,
                right: 16,
                zIndex: 9997,
                maxWidth: 480,
                margin: "0 auto",
                display: "flex",
                alignItems: "center",
                gap: 12,
                background: "var(--panel, #1a1f2e)",
                border: "1px solid var(--border, rgba(255,255,255,0.1))",
                borderRadius: 16,
                padding: "12px 14px",
                boxShadow: "0 -8px 40px rgba(0,0,0,0.3)",
                backdropFilter: "blur(20px)",
            }}
        >
            <span style={{ fontSize: "1.1rem" }}>🔄</span>
            <span
                style={{
                    flex: 1,
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    color: "var(--card-title, #fff)",
                }}
            >
                Yeni bir sürüm mevcut
            </span>
            <button
                onClick={applyUpdate}
                style={{
                    padding: "8px 14px",
                    borderRadius: 10,
                    border: "none",
                    background: "linear-gradient(135deg, var(--primary, #1f6feb), var(--primary-2, #134ea5))",
                    color: "white",
                    fontSize: "0.8rem",
                    fontWeight: 800,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    whiteSpace: "nowrap",
                }}
            >
                Güncelle
            </button>
            <button
                onClick={() => setDismissed(true)}
                aria-label="Kapat"
                style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    border: "1px solid var(--border, rgba(255,255,255,0.1))",
                    background: "transparent",
                    color: "var(--muted, #999)",
                    fontSize: "1rem",
                    cursor: "pointer",
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                }}
            >
                ✕
            </button>
        </div>
    );
}
