"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { safeRedirectPath } from "@/lib/safeRedirect";
import { AuthShell, AuthField } from "@/components/auth/AuthShell";
import styles from "@/components/auth/AuthShell.module.css";

const OK_SOZ = "gönderildi";

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
            const params = new URLSearchParams(window.location.search);
            window.location.href = safeRedirectPath(params.get("next") ?? params.get("callbackUrl"), "/");
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
            setError(data.message || "Şifre sıfırlama talimatları e-posta adresine gönderildi.");
            setTimeout(() => {
                setError("");
                setView("login");
            }, 4000);
        } catch {
            setError("Bağlantı hatası. Lütfen tekrar dene.");
        } finally {
            setLoading(false);
        }
    };

    const banner = error && (
        <div className={`${styles.banner} ${error.includes(OK_SOZ) ? styles.bannerSuccess : styles.bannerError}`} role="alert">
            {error}
        </div>
    );

    return (
        <AuthShell>
            {view === "login" && (
                <>
                    <h1 className={styles.title}>Tekrar hoş geldin</h1>
                    <p className={styles.subtitle}>Lütfen hesabına giriş yap.</p>

                    <form onSubmit={handleLogin} className={styles.form}>
                        {banner}
                        <AuthField id="login-email" label="E-posta adresi" icon="mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="ornek@mail.com" autoComplete="email" />
                        <AuthField id="login-password" label="Şifre" icon="lock" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" autoComplete="current-password" />
                        <button type="button" onClick={() => { setError(""); setView("forgot"); }} className={styles.link}>Şifremi unuttum</button>
                        <button type="submit" disabled={loading} className={styles.submit}>
                            {loading ? "Giriş yapılıyor..." : "Giriş yap"}
                        </button>
                    </form>

                    <div className={styles.footer}>
                        Hesabın yok mu?
                        <button onClick={() => { setError(""); setView("register"); }} className={styles.footerLink}>Kayıt ol</button>
                    </div>
                </>
            )}

            {view === "register" && (
                <>
                    <h1 className={styles.title}>Hesap oluştur</h1>
                    <p className={styles.subtitle}>Ücretsiz üye ol; net değer ve emsalleri aç.</p>

                    <form onSubmit={handleRegister} className={styles.form}>
                        {banner}
                        <AuthField id="reg-name" label="Ad soyad" icon="user" type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Örn: Ahmet Yılmaz" autoComplete="name" />
                        <AuthField id="reg-email" label="E-posta adresi" icon="mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="ornek@mail.com" autoComplete="email" />
                        <AuthField id="reg-password" label="Şifre" icon="lock" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="En az 8 karakter" autoComplete="new-password" />
                        <button type="submit" disabled={loading} className={styles.submit}>
                            {loading ? "Kayıt yapılıyor..." : "Kayıt ol"}
                        </button>
                    </form>

                    <div className={styles.footer}>
                        Zaten üye misin?
                        <button onClick={() => { setError(""); setView("login"); }} className={styles.footerLink}>Giriş yap</button>
                    </div>
                </>
            )}

            {view === "forgot" && (
                <>
                    <h1 className={styles.title}>Şifreni sıfırla</h1>
                    <p className={styles.subtitle}>E-posta adresini yaz, sıfırlama bağlantısı gönderelim.</p>

                    <form onSubmit={handleForgot} className={styles.form}>
                        {banner}
                        <AuthField id="forgot-email" label="E-posta adresi" icon="mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="ornek@mail.com" autoComplete="email" />
                        <button type="submit" disabled={loading} className={styles.submit}>
                            {loading ? "Gönderiliyor..." : "Bağlantı gönder"}
                        </button>
                    </form>

                    <div className={styles.footer}>
                        Hatırladın mı?
                        <button onClick={() => { setError(""); setView("login"); }} className={styles.footerLink}>Giriş yap</button>
                    </div>
                </>
            )}
        </AuthShell>
    );
}
