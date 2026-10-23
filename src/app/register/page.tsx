"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthShell, AuthField } from "@/components/auth/AuthShell";
import styles from "@/components/auth/AuthShell.module.css";

export default function RegisterPage() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
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
                router.push("/login"); // Kayıt başarılıysa girişe yönlendir
            } else {
                setError(data.message || "Kayıt sırasında bir hata oluştu.");
                setLoading(false);
            }
        } catch {
            setError("Bağlantı hatası.");
            setLoading(false);
        }
    };

    return (
        <AuthShell>
            <h1 className={styles.title}>Hesap oluştur</h1>
            <p className={styles.subtitle}>Ücretsiz üye ol; net değer ve emsalleri aç.</p>

            <form onSubmit={handleSubmit} className={styles.form}>
                {error && <div className={`${styles.banner} ${styles.bannerError}`} role="alert">{error}</div>}
                <AuthField id="register-name" label="Ad soyad" icon="user" type="text" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
                <AuthField id="register-email" label="E-posta adresi" icon="mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="ornek@mail.com" autoComplete="email" />
                <AuthField id="register-password" label="Şifre" icon="lock" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="En az 8 karakter" autoComplete="new-password" />
                <button type="submit" disabled={loading} className={styles.submit}>
                    {loading ? "Kayıt yapılıyor..." : "Kayıt ol"}
                </button>
            </form>

            <div className={styles.footer}>
                Zaten üye misin?
                <Link href="/login" className={styles.footerLink}>Giriş yap</Link>
            </div>
        </AuthShell>
    );
}
