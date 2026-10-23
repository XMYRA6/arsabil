"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthShell, AuthField } from "@/components/auth/AuthShell";
import styles from "@/components/auth/AuthShell.module.css";

export default function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = use(params);
    const router = useRouter();
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (password.length < 8) {
            setError("Şifre en az 8 karakter olmalıdır.");
            return;
        }
        if (password !== confirmPassword) {
            setError("Şifreler eşleşmiyor.");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, password }),
            });
            const data = await res.json();

            if (res.ok) {
                setSuccess(data.message);
                setTimeout(() => router.push("/login"), 2500);
            } else {
                setError(data.message || "Bir hata oluştu.");
            }
        } catch {
            setError("Bağlantı hatası. Lütfen tekrar deneyin.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthShell>
            <h1 className={styles.title}>Yeni şifre belirle</h1>
            <p className={styles.subtitle}>Hesabın için yeni bir şifre gir.</p>

            {!success ? (
                <form onSubmit={handleSubmit} className={styles.form}>
                    {error && <div className={`${styles.banner} ${styles.bannerError}`} role="alert">{error}</div>}
                    <AuthField id="password" label="Yeni şifre" icon="lock" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={8} autoComplete="new-password" />
                    <AuthField id="confirmPassword" label="Şifre tekrar" icon="lock" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" required minLength={8} autoComplete="new-password" />
                    <button type="submit" className={styles.submit} disabled={loading}>
                        {loading ? "Güncelleniyor..." : "Şifreyi güncelle"}
                    </button>
                </form>
            ) : (
                <div className={`${styles.banner} ${styles.bannerSuccess}`} role="status">{success}</div>
            )}

            <div className={styles.footer}>
                <Link href="/login" className={styles.footerLink}>← Giriş ekranına dön</Link>
            </div>
        </AuthShell>
    );
}
