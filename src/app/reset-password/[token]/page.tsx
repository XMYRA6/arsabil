"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./page.module.css";

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
        <div className={styles.page}>
            <div className={styles.card}>
                <h1 className={styles.title}>Yeni Şifre Belirle</h1>
                <p className={styles.subtitle}>Hesabın için yeni bir şifre gir.</p>

                {error && <div className={`${styles.banner} ${styles.bannerError}`}>{error}</div>}
                {success && <div className={`${styles.banner} ${styles.bannerSuccess}`}>{success}</div>}

                {!success && (
                    <form onSubmit={handleSubmit}>
                        <div className={styles.fieldGroup}>
                            <label className={styles.label} htmlFor="password">Yeni Şifre</label>
                            <input
                                id="password"
                                type="password"
                                className={styles.input}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                minLength={8}
                            />
                        </div>
                        <div className={styles.fieldGroup}>
                            <label className={styles.label} htmlFor="confirmPassword">Şifre Tekrar</label>
                            <input
                                id="confirmPassword"
                                type="password"
                                className={styles.input}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                minLength={8}
                            />
                        </div>
                        <button type="submit" className={styles.submitBtn} disabled={loading}>
                            {loading ? "Güncelleniyor..." : "Şifreyi Güncelle"}
                        </button>
                    </form>
                )}

                <Link href="/login" className={styles.loginLink}>← Giriş Ekranına Dön</Link>
            </div>
        </div>
    );
}
