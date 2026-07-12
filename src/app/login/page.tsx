"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import styles from "./login.module.css";

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

        try {
            const res = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });
            const data = await res.json();
            setError(data.message || "Şifre sıfırlama talimatları e-posta adresinize gönderildi.");
            setTimeout(() => {
                setError("");
                setView("login");
            }, 4000);
        } catch {
            setError("Bağlantı hatası. Lütfen tekrar deneyin.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.page}>
            <div className={styles.orbTop} />
            <div className={styles.orbBottom} />

            <div className={styles.panel}>
                {/* Left Side: Branding / Intro */}
                <div className={styles.brandSide}>
                    <div className={styles.brandPattern} />

                    <div className={styles.brandContent}>
                        <div className={styles.brandLogoRow}>
                            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect width="40" height="40" rx="12" fill="white" />
                                <circle cx="20" cy="20" r="8" fill="var(--primary)" />
                            </svg>
                            <h2 className={styles.brandLogoText}>ArsaBil</h2>
                        </div>
                        <h1 className={styles.brandHeading}>
                            Geleceğinize <br />
                            <span className={styles.brandHeadingMuted}>Zemin Hazırlayın</span>
                        </h1>
                        <p className={styles.brandParagraph}>
                            Arsanızın gerçek değerini tahmin etmeyin, bilimsel verilerle hesaplayın. Arsa sahipleri ve müteahhitlerin güven noktasına hoş geldiniz.
                        </p>
                    </div>
                </div>

                {/* Right Side: Auth Forms */}
                <div className={styles.formSide}>

                    {/* VIEW: LOGIN */}
                    {view === "login" && (
                        <div className={styles.formView}>
                            <div className={styles.formHeader}>
                                <h2 className={styles.formTitle}>Tekrar Hoş Geldiniz</h2>
                                <p className={styles.formSubtitle}>Lütfen hesabınıza giriş yapın.</p>
                            </div>

                            <form onSubmit={handleLogin} className={styles.form}>
                                {error && (
                                    <div className={`${styles.errorBanner} ${error.includes("gönderildi") ? styles.errorBannerSuccess : ''}`}>
                                        {error}
                                    </div>
                                )}

                                <div className={styles.fieldGroup}>
                                    <label className={styles.label}>E-Posta Adresi</label>
                                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="ornek@mail.com" className={styles.input} />
                                </div>

                                <div className={styles.fieldGroup}>
                                    <div className={styles.fieldRow}>
                                        <label className={styles.label}>Şifre</label>
                                        <button type="button" onClick={() => { setError(""); setView("forgot"); }} className={styles.forgotLink}>Şifremi Unuttum</button>
                                    </div>
                                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" className={styles.input} />
                                </div>

                                <button type="submit" disabled={loading} className={styles.submitBtn}>
                                    {loading ? "Giriş Yapılıyor..." : "Giriş Yap"}
                                </button>
                            </form>

                            <div className={styles.footerText}>
                                Hesabınız yok mu?{" "}
                                <button onClick={() => { setError(""); setView("register"); }} className={styles.footerLink}>Hemen Kayıt Olun</button>
                            </div>
                        </div>
                    )}

                    {/* VIEW: REGISTER */}
                    {view === "register" && (
                        <div className={styles.formView}>
                            <div className={styles.formHeader}>
                                <h2 className={styles.formTitle}>Aramıza Katılın</h2>
                                <p className={styles.formSubtitle}>Sistemi hemen kullanmak için kayıt olun.</p>
                            </div>

                            <form onSubmit={handleRegister} className={`${styles.form} ${styles.formCompact}`}>
                                {error && (
                                    <div className={styles.errorBanner}>
                                        {error}
                                    </div>
                                )}

                                <div className={styles.fieldGroup}>
                                    <label className={styles.label}>Ad Soyad</label>
                                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Örn: Ahmet Yılmaz" className={styles.input} />
                                </div>

                                <div className={styles.fieldGroup}>
                                    <label className={styles.label}>E-Posta Adresi</label>
                                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="ornek@mail.com" className={styles.input} />
                                </div>

                                <div className={styles.fieldGroup}>
                                    <label className={styles.label}>Şifre</label>
                                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" className={styles.input} />
                                </div>

                                <button type="submit" disabled={loading} className={styles.submitBtn}>
                                    {loading ? "Kayıt Yapılıyor..." : "Kayıt Ol"}
                                </button>
                            </form>

                            <div className={styles.footerText}>
                                Zaten hesabınız var mı?{" "}
                                <button onClick={() => { setError(""); setView("login"); }} className={styles.footerLink}>Giriş Yapın</button>
                            </div>
                        </div>
                    )}

                    {/* VIEW: FORGOT PASSWORD */}
                    {view === "forgot" && (
                        <div className={styles.formView}>
                            <div className={styles.formHeader}>
                                <h2 className={styles.formTitle}>Şifremi Unuttum</h2>
                                <p className={styles.formSubtitle}>E-posta adresinizi girin, sıfırlama talimatlarını gönderelim.</p>
                            </div>

                            <form onSubmit={handleForgot} className={styles.form}>
                                {error && (
                                    <div className={`${styles.errorBanner} ${error.includes("gönderildi") ? styles.errorBannerSuccess : ''}`}>
                                        {error}
                                    </div>
                                )}

                                <div className={styles.fieldGroup}>
                                    <label className={styles.label}>E-Posta Adresi</label>
                                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="ornek@mail.com" className={styles.input} />
                                </div>

                                <button type="submit" disabled={loading} className={styles.submitBtn}>
                                    {loading ? "Gönderiliyor..." : "Bağlantı Gönder"}
                                </button>
                            </form>

                            <div className={styles.footerText}>
                                <button onClick={() => { setError(""); setView("login"); }} className={styles.footerLink}>← Giriş Ekranına Dön</button>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
