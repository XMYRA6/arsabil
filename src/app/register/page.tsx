"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import styles from "./register.module.css";

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
        <div className={styles.page}>
            <div className={styles.column}>
                <div className={styles.header}>
                    <h1 className={styles.logo}>ARSABİL</h1>
                    <p className={styles.subtitle}>Sisteme Kayıt Olun</p>
                </div>

                <Card className={styles.sealCard}>
                    <form onSubmit={handleSubmit} className={styles.form}>
                        {error && (
                            <div className={styles.errorBanner}>
                                {error}
                            </div>
                        )}

                        <Input
                            label="Ad Soyad"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            className={styles.sealInput}
                        />

                        <Input
                            label="E-Posta Adresi"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className={styles.sealInput}
                        />

                        <Input
                            label="Şifre"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className={styles.sealInput}
                        />

                        <div className={styles.submitRow}>
                            <Button type="submit" variant="primary" fullWidth disabled={loading} className={styles.sealSubmit}>
                                {loading ? "Kayıt Yapılıyor..." : "Kayıt Ol"}
                            </Button>
                        </div>
                    </form>

                    <div className={styles.footerText}>
                        Zaten hesabınız var mı?{" "}
                        <Link href="/login" className={styles.footerLink}>
                            Giriş Yapın
                        </Link>
                    </div>
                </Card>
            </div>
        </div>
    );
}
