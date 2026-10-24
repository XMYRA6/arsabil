"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import styles from "@/components/auth/AuthShell.module.css";

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
                    setMessage("Bağlantı hatası. Lütfen tekrar dene.");
                }
            });
        return () => { cancelled = true; };
    }, [token]);

    return (
        <AuthShell>
            <div className={styles.result}>
                {status === "loading" && (
                    <>
                        <h1 className={styles.title}>E-posta doğrulama</h1>
                        <p className={styles.subtitle} role="status">Doğrulanıyor...</p>
                    </>
                )}
                {status === "success" && (
                    <>
                        <span className={`${styles.resultIcon} ${styles.resultIconOk}`} aria-hidden="true">
                            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5L20 7" /></svg>
                        </span>
                        <h1 className={styles.title}>E-posta doğrulandı</h1>
                        <p className={styles.subtitle} role="status">{message}</p>
                        <Link href="/login" className={styles.submit}>Giriş yap</Link>
                    </>
                )}
                {status === "error" && (
                    <>
                        <span className={`${styles.resultIcon} ${styles.resultIconBad}`} aria-hidden="true">
                            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
                        </span>
                        <h1 className={styles.title}>Bağlantı geçersiz</h1>
                        <p className={styles.subtitle} role="alert">{message || "Bağlantının süresi dolmuş olabilir. Yeni bir bağlantı isteyebilirsin."}</p>
                        <Link href="/login" className={`${styles.submit} ${styles.submitAmber}`}>Giriş ekranına dön</Link>
                    </>
                )}
            </div>
        </AuthShell>
    );
}
