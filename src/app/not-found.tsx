"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/ui/ThemeToggle"; // Using existing components

export default function NotFound() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR hidrasyon koruması için mount flag
        setMounted(true);
    }, []);

    if (!mounted) return null;

    return (
        <div style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            overflow: "hidden",
            background: "var(--bg-body)",
            fontFamily: "'Inter', sans-serif",
            color: "var(--text)"
        }}>
            {/* Blueprint Grid Background Pattern */}
            <div style={{
                position: "absolute",
                inset: 0,
                opacity: 0.15,
                backgroundImage: `
          linear-gradient(var(--primary) 1px, transparent 1px),
          linear-gradient(90deg, var(--primary) 1px, transparent 1px)
        `,
                backgroundSize: "40px 40px",
                backgroundPosition: "center center",
                zIndex: 0,
                pointerEvents: "none"
            }} />

            {/* Decorative Blueprint Lines */}
            <div style={{
                position: "absolute",
                top: "15%", left: "10%",
                width: "200px", height: "1px",
                background: "var(--primary)", opacity: 0.4,
                transform: "rotate(45deg)",
                animation: "drawLine 3s ease-out forwards"
            }} />
            <div style={{
                position: "absolute",
                bottom: "20%", right: "15%",
                width: "300px", height: "1px",
                background: "var(--primary)", opacity: 0.3,
                transform: "rotate(-30deg)",
                animation: "drawLine 4s ease-out forwards 0.5s"
            }} />

            {/* Top Navbar Area for context */}
            <div style={{ position: 'absolute', top: 24, right: 32, zIndex: 10 }}>
                <ThemeToggle />
            </div>

            <div style={{
                position: "relative",
                zIndex: 10,
                background: "var(--panel)",
                padding: "4rem 3rem",
                borderRadius: "24px",
                boxShadow: "var(--shadow)",
                border: "1px solid var(--border)",
                backdropFilter: "blur(20px)",
                textAlign: "center",
                maxWidth: "600px",
                width: "90%",
                animation: "slideUpFade 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards"
            }}>

                {/* Animated Architectural Compass/Ruler Icon */}
                <div style={{
                    width: "120px", height: "120px",
                    margin: "0 auto 2rem",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    position: "relative"
                }}>
                    <div style={{
                        position: "absolute", inset: 0,
                        border: "2px dashed var(--primary)", opacity: 0.4,
                        borderRadius: "50%",
                        animation: "spin 20s linear infinite"
                    }} />
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "pulseScale 3s ease-in-out infinite" }}>
                        {/* Building outline */}
                        <path d="M4 22V8l8-6 8 6v14" />
                        {/* Roof line */}
                        <path d="M2 10l10-8 10 8" />
                        {/* Door */}
                        <path d="M9 22v-6h6v6" />
                        {/* Windows */}
                        <path d="M8 12h2v2H8z" />
                        <path d="M14 12h2v2h-2z" />
                        {/* Construction lines */}
                        <path d="M1 22h22" strokeDasharray="2 2" opacity="0.5" />
                        <path d="M12 2v20" strokeLinecap="butt" strokeDasharray="1 3" opacity="0.3" />
                    </svg>
                </div>

                <h1 style={{
                    fontSize: "5rem",
                    fontWeight: 900,
                    margin: 0,
                    color: "var(--primary)",
                    lineHeight: 1,
                    letterSpacing: "-2px",
                    textShadow: "0 4px 20px var(--primary-glow)"
                }}>404</h1>

                <h2 style={{
                    fontSize: "1.8rem",
                    fontWeight: 700,
                    color: "var(--card-title)",
                    marginTop: "1rem",
                    marginBottom: "1rem"
                }}>
                    Aradığınız sayfa bulunamadı
                </h2>

                <p style={{
                    fontSize: "1rem",
                    color: "var(--muted)",
                    lineHeight: 1.6,
                    marginBottom: "2.5rem",
                    maxWidth: "400px",
                    margin: "1rem auto 2.5rem"
                }}>
                    Görünüşe göre çizim planlarında bu sayfaya giden bir koordinat yok. Yanlış bir parsel numarası veya URL adresi girmiş olabilirsiniz.
                </p>

                <Link href="/" style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    background: "var(--primary)",
                    color: "white",
                    padding: "16px 32px",
                    borderRadius: "14px",
                    fontWeight: 700,
                    textDecoration: "none",
                    transition: "all 0.2s",
                    boxShadow: "0 4px 14px var(--primary-glow)",
                }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
                >
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    Ana Sayfaya Dön
                </Link>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
        @keyframes slideUpFade {
          0% { opacity: 0; transform: translateY(40px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes drawLine {
          0% { width: 0; opacity: 0; }
          100% { opacity: 0.4; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulseScale {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `}} />
        </div>
    );
}
