"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export default function LoginPage() {
    const [view, setView] = useState<"login" | "register" | "forgot">("login");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        const res = await signIn("credentials", {
            redirect: false,
            email,
            password,
        });

        if (res?.error) {
            setError(res.error);
            setLoading(false);
        } else {
            window.location.href = "/";
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, password, role: "USER" }),
            });

            const data = await res.json();

            if (res.ok) {
                setError("");
                setPassword("");
                setView("login");
            } else {
                setError(data.message || "Kayıt sırasında bir hata oluştu.");
            }
        } catch {
            setError("Bağlantı hatası.");
        } finally {
            setLoading(false);
        }
    };

    const handleForgot = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        // Simüle edilmiş şifre hatırlatma işlemi
        setTimeout(() => {
            setError("Şifre sıfırlama talimatları e-posta adresinize gönderildi.");
            setLoading(false);
            setTimeout(() => {
                setError("");
                setView("login");
            }, 3000);
        }, 1500);
    };

    return (
        <div style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            overflow: "hidden",
            background: "var(--bg-body)",
            fontFamily: "'Inter', sans-serif"
        }}>
            {/* Background Animated Orbs */}
            <div style={{
                position: "absolute",
                top: "-10%",
                left: "-10%",
                width: "50%",
                height: "50%",
                background: "radial-gradient(circle, var(--primary-glow) 0%, transparent 70%)",
                filter: "blur(80px)",
                animation: "float 10s ease-in-out infinite",
                zIndex: 0
            }} />
            <div style={{
                position: "absolute",
                bottom: "-10%",
                right: "-10%",
                width: "60%",
                height: "60%",
                background: "radial-gradient(circle, rgba(47, 191, 113, 0.15) 0%, transparent 70%)",
                filter: "blur(100px)",
                animation: "float 14s ease-in-out infinite reverse",
                zIndex: 0
            }} />

            <div style={{
                width: "100%",
                maxWidth: "1000px",
                margin: "0 20px",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                background: "var(--panel)",
                borderRadius: "24px",
                boxShadow: "var(--shadow)",
                border: "1px solid var(--border)",
                overflow: "hidden",
                zIndex: 10,
                position: "relative",
                backdropFilter: "blur(20px)"
            }}>
                {/* Left Side: Branding / Intro */}
                <div style={{
                    padding: "4rem",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    background: "var(--hero-bg)",
                    color: "white",
                    position: "relative",
                    overflow: "hidden"
                }}>
                    <div style={{
                        position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                        background: "url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjIiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNykiLz48L3N2Zz4=') repeat",
                        opacity: 0.5
                    }} />

                    <div style={{ position: "relative", zIndex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "2rem" }}>
                            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect width="40" height="40" rx="12" fill="white" />
                                <circle cx="20" cy="20" r="8" fill="var(--primary)" />
                            </svg>
                            <h2 style={{ fontSize: "2rem", fontWeight: 800, letterSpacing: "-1px" }}>ArsaBil</h2>
                        </div>
                        <h1 style={{ fontSize: "2.5rem", fontWeight: 700, lineHeight: 1.2, marginBottom: "1.5rem" }}>
                            Geleceğinize <br />
                            <span style={{ color: "rgba(255,255,255,0.8)" }}>Zemin Hazırlayın</span>
                        </h1>
                        <p style={{ fontSize: "1rem", lineHeight: 1.6, opacity: 0.8, maxWidth: "80%" }}>
                            Arsanızın gerçek değerini tahmin etmeyin, bilimsel verilerle hesaplayın. Arsa sahipleri ve müteahhitlerin güven noktasına hoş geldiniz.
                        </p>
                    </div>
                </div>

                {/* Right Side: Auth Forms */}
                <div style={{ padding: "4rem 3rem", display: "flex", flexDirection: "column", justifyContent: "center", position: "relative" }}>

                    {/* VIEW: LOGIN */}
                    {view === "login" && (
                        <div style={{ animation: "fadeSlide 0.4s ease forwards" }}>
                            <div style={{ marginBottom: "2.5rem" }}>
                                <h2 style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--card-title)", marginBottom: "0.5rem" }}>Tekrar Hoş Geldiniz</h2>
                                <p style={{ color: "var(--muted)", fontSize: "0.95rem" }}>Lütfen hesabınıza giriş yapın.</p>
                            </div>

                            <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                                {error && (
                                    <div style={{ backgroundColor: error.includes("gönderildi") ? "rgba(47, 191, 113, 0.1)" : "rgba(255, 90, 95, 0.1)", color: error.includes("gönderildi") ? "var(--primary)" : "var(--red)", padding: "1rem", borderRadius: "12px", fontSize: "0.9rem", fontWeight: 500, border: error.includes("gönderildi") ? "1px solid rgba(47, 191, 113, 0.2)" : "1px solid rgba(255, 90, 95, 0.2)" }}>
                                        {error}
                                    </div>
                                )}

                                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                    <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--label-color)" }}>E-Posta Adresi</label>
                                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="ornek@mail.com"
                                        style={{ width: "100%", padding: "14px 16px", borderRadius: "12px", border: "1px solid var(--border)", background: "var(--input-bg)", color: "var(--text)", fontSize: "0.95rem", outline: "none", transition: "all 0.2s" }}
                                        onFocus={(e) => { e.target.style.borderColor = "var(--primary)"; e.target.style.boxShadow = "var(--input-focus-shadow)"; }}
                                        onBlur={(e) => { e.target.style.borderColor = "var(--border)"; e.target.style.boxShadow = "none"; }}
                                    />
                                </div>

                                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--label-color)" }}>Şifre</label>
                                        <button type="button" onClick={() => { setError(""); setView("forgot"); }} style={{ fontSize: "0.8rem", color: "var(--primary)", fontWeight: 600, background: "none", border: "none", cursor: "pointer" }}>Şifremi Unuttum</button>
                                    </div>
                                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••"
                                        style={{ width: "100%", padding: "14px 16px", borderRadius: "12px", border: "1px solid var(--border)", background: "var(--input-bg)", color: "var(--text)", fontSize: "0.95rem", outline: "none", transition: "all 0.2s" }}
                                        onFocus={(e) => { e.target.style.borderColor = "var(--primary)"; e.target.style.boxShadow = "var(--input-focus-shadow)"; }}
                                        onBlur={(e) => { e.target.style.borderColor = "var(--border)"; e.target.style.boxShadow = "none"; }}
                                    />
                                </div>

                                <button type="submit" disabled={loading}
                                    style={{ width: "100%", padding: "16px", marginTop: "0.5rem", borderRadius: "12px", background: loading ? "var(--muted)" : "var(--primary)", color: "white", fontSize: "1rem", fontWeight: 700, border: "none", cursor: loading ? "not-allowed" : "pointer", transition: "all 0.2s", boxShadow: loading ? "none" : "0 4px 14px var(--primary-glow)" }}
                                    onMouseEnter={(e) => { if (!loading) e.currentTarget.style.transform = "translateY(-2px)"; }}
                                    onMouseLeave={(e) => { if (!loading) e.currentTarget.style.transform = "translateY(0)"; }}
                                >
                                    {loading ? "Giriş Yapılıyor..." : "Giriş Yap"}
                                </button>
                            </form>

                            <div style={{ marginTop: "2rem", textAlign: "center", fontSize: "0.9rem", color: "var(--muted)" }}>
                                Hesabınız yok mu?{" "}
                                <button onClick={() => { setError(""); setView("register"); }} style={{ color: "var(--primary)", fontWeight: 700, background: "none", border: "none", cursor: "pointer", fontSize: "0.9rem" }}>Hemen Kayıt Olun</button>
                            </div>
                        </div>
                    )}

                    {/* VIEW: REGISTER */}
                    {view === "register" && (
                        <div style={{ animation: "fadeSlide 0.4s ease forwards" }}>
                            <div style={{ marginBottom: "2.5rem" }}>
                                <h2 style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--card-title)", marginBottom: "0.5rem" }}>Aramıza Katılın</h2>
                                <p style={{ color: "var(--muted)", fontSize: "0.95rem" }}>Sistemi hemen kullanmak için kayıt olun.</p>
                            </div>

                            <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
                                {error && (
                                    <div style={{ backgroundColor: "rgba(255, 90, 95, 0.1)", color: "var(--red)", padding: "1rem", borderRadius: "12px", fontSize: "0.9rem", fontWeight: 500, border: "1px solid rgba(255, 90, 95, 0.2)" }}>
                                        {error}
                                    </div>
                                )}

                                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                    <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--label-color)" }}>Ad Soyad</label>
                                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Örn: Ahmet Yılmaz"
                                        style={{ width: "100%", padding: "14px 16px", borderRadius: "12px", border: "1px solid var(--border)", background: "var(--input-bg)", color: "var(--text)", fontSize: "0.95rem", outline: "none", transition: "all 0.2s" }}
                                        onFocus={(e) => { e.target.style.borderColor = "var(--primary)"; e.target.style.boxShadow = "var(--input-focus-shadow)"; }}
                                        onBlur={(e) => { e.target.style.borderColor = "var(--border)"; e.target.style.boxShadow = "none"; }}
                                    />
                                </div>

                                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                    <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--label-color)" }}>E-Posta Adresi</label>
                                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="ornek@mail.com"
                                        style={{ width: "100%", padding: "14px 16px", borderRadius: "12px", border: "1px solid var(--border)", background: "var(--input-bg)", color: "var(--text)", fontSize: "0.95rem", outline: "none", transition: "all 0.2s" }}
                                        onFocus={(e) => { e.target.style.borderColor = "var(--primary)"; e.target.style.boxShadow = "var(--input-focus-shadow)"; }}
                                        onBlur={(e) => { e.target.style.borderColor = "var(--border)"; e.target.style.boxShadow = "none"; }}
                                    />
                                </div>

                                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                    <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--label-color)" }}>Şifre</label>
                                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••"
                                        style={{ width: "100%", padding: "14px 16px", borderRadius: "12px", border: "1px solid var(--border)", background: "var(--input-bg)", color: "var(--text)", fontSize: "0.95rem", outline: "none", transition: "all 0.2s" }}
                                        onFocus={(e) => { e.target.style.borderColor = "var(--primary)"; e.target.style.boxShadow = "var(--input-focus-shadow)"; }}
                                        onBlur={(e) => { e.target.style.borderColor = "var(--border)"; e.target.style.boxShadow = "none"; }}
                                    />
                                </div>

                                <button type="submit" disabled={loading}
                                    style={{ width: "100%", padding: "16px", marginTop: "0.5rem", borderRadius: "12px", background: loading ? "var(--muted)" : "var(--primary)", color: "white", fontSize: "1rem", fontWeight: 700, border: "none", cursor: loading ? "not-allowed" : "pointer", transition: "all 0.2s", boxShadow: loading ? "none" : "0 4px 14px var(--primary-glow)" }}
                                    onMouseEnter={(e) => { if (!loading) e.currentTarget.style.transform = "translateY(-2px)"; }}
                                    onMouseLeave={(e) => { if (!loading) e.currentTarget.style.transform = "translateY(0)"; }}
                                >
                                    {loading ? "Kayıt Yapılıyor..." : "Kayıt Ol"}
                                </button>
                            </form>

                            <div style={{ marginTop: "2rem", textAlign: "center", fontSize: "0.9rem", color: "var(--muted)" }}>
                                Zaten hesabınız var mı?{" "}
                                <button onClick={() => { setError(""); setView("login"); }} style={{ color: "var(--primary)", fontWeight: 700, background: "none", border: "none", cursor: "pointer", fontSize: "0.9rem" }}>Giriş Yapın</button>
                            </div>
                        </div>
                    )}

                    {/* VIEW: FORGOT PASSWORD */}
                    {view === "forgot" && (
                        <div style={{ animation: "fadeSlide 0.4s ease forwards" }}>
                            <div style={{ marginBottom: "2.5rem" }}>
                                <h2 style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--card-title)", marginBottom: "0.5rem" }}>Şifremi Unuttum</h2>
                                <p style={{ color: "var(--muted)", fontSize: "0.95rem" }}>E-posta adresinizi girin, sıfırlama talimatlarını gönderelim.</p>
                            </div>

                            <form onSubmit={handleForgot} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                                {error && (
                                    <div style={{ backgroundColor: error.includes("gönderildi") ? "rgba(47, 191, 113, 0.1)" : "rgba(255, 90, 95, 0.1)", color: error.includes("gönderildi") ? "var(--primary)" : "var(--red)", padding: "1rem", borderRadius: "12px", fontSize: "0.9rem", fontWeight: 500, border: error.includes("gönderildi") ? "1px solid rgba(47, 191, 113, 0.2)" : "1px solid rgba(255, 90, 95, 0.2)" }}>
                                        {error}
                                    </div>
                                )}

                                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                    <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--label-color)" }}>E-Posta Adresi</label>
                                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="ornek@mail.com"
                                        style={{ width: "100%", padding: "14px 16px", borderRadius: "12px", border: "1px solid var(--border)", background: "var(--input-bg)", color: "var(--text)", fontSize: "0.95rem", outline: "none", transition: "all 0.2s" }}
                                        onFocus={(e) => { e.target.style.borderColor = "var(--primary)"; e.target.style.boxShadow = "var(--input-focus-shadow)"; }}
                                        onBlur={(e) => { e.target.style.borderColor = "var(--border)"; e.target.style.boxShadow = "none"; }}
                                    />
                                </div>

                                <button type="submit" disabled={loading}
                                    style={{ width: "100%", padding: "16px", marginTop: "0.5rem", borderRadius: "12px", background: loading ? "var(--muted)" : "var(--primary)", color: "white", fontSize: "1rem", fontWeight: 700, border: "none", cursor: loading ? "not-allowed" : "pointer", transition: "all 0.2s", boxShadow: loading ? "none" : "0 4px 14px var(--primary-glow)" }}
                                    onMouseEnter={(e) => { if (!loading) e.currentTarget.style.transform = "translateY(-2px)"; }}
                                    onMouseLeave={(e) => { if (!loading) e.currentTarget.style.transform = "translateY(0)"; }}
                                >
                                    {loading ? "Gönderiliyor..." : "Bağlantı Gönder"}
                                </button>
                            </form>

                            <div style={{ marginTop: "2rem", textAlign: "center", fontSize: "0.9rem", color: "var(--muted)" }}>
                                <button onClick={() => { setError(""); setView("login"); }} style={{ color: "var(--primary)", fontWeight: 700, background: "none", border: "none", cursor: "pointer", fontSize: "0.9rem" }}>← Giriş Ekranına Dön</button>
                            </div>
                        </div>
                    )}

                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes float {
                    0% { transform: translateY(0) scale(1); }
                    50% { transform: translateY(-30px) scale(1.05); }
                    100% { transform: translateY(0) scale(1); }
                }
                @keyframes fadeSlide {
                    0% { opacity: 0; transform: translateX(15px); }
                    100% { opacity: 1; transform: translateX(0); }
                }
                @media (max-width: 900px) {
                    div[style*="grid-template-columns"] {
                        grid-template-columns: 1fr !important;
                        max-width: 500px !important;
                    }
                    div[style*="padding: 4rem"] {
                        padding: 2.5rem !important;
                    }
                    div[style*="padding: 4rem 3rem"] {
                        padding: 2.5rem 2rem !important;
                    }
                }
            `}} />
        </div>
    );
}
