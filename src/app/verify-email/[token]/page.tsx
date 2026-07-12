"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import styles from "./page.module.css";

export default function VerifyEmailPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = use(params);
    const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
    const [message, setMessage] = useState("");

    useEffect(() => {
        let cancelled = false;
        fetch("/api/auth/verify-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
        })
            .then(async (res) => {
                const data = await res.json();
                if (cancelled) return;
                setStatus(res.ok ? "success" : "error");
                setMessage(data.message);
            })
            .catch(() => {
                if (!cancelled) {
                    setStatus("error");
                    setMessage("Bağlantı hatası. Lütfen tekrar deneyin.");
                }
            });
        return () => { cancelled = true; };
    }, [token]);

    return (
        <div className={styles.page}>
            <div className={styles.card}>
                <h1 className={styles.title}>E-posta Doğrulama</h1>
                {status === "loading" && <p className={styles.subtitle}>Doğrulanıyor...</p>}
                {status === "success" && <div className={`${styles.banner} ${styles.bannerSuccess}`}>{message}</div>}
                {status === "error" && <div className={`${styles.banner} ${styles.bannerError}`}>{message}</div>}
                <Link href="/login" className={styles.loginLink}>Giriş Ekranına Dön</Link>
            </div>
        </div>
    );
}
