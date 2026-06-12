"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

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
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--panel)" }}>
            <div style={{ width: "100%", maxWidth: "450px" }}>
                <div style={{ textAlign: "center", marginBottom: "2rem" }}>
                    <h1 style={{ color: "var(--primary)", fontWeight: 700, letterSpacing: "-0.5px" }}>ARSABİL</h1>
                    <p style={{ color: "var(--muted)", marginTop: "0.5rem" }}>Sisteme Kayıt Olun</p>
                </div>

                <Card>
                    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                        {error && (
                            <div style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "var(--red)", padding: "0.75rem", borderRadius: "var(--radius-md)", fontSize: "0.9rem" }}>
                                {error}
                            </div>
                        )}

                        <Input
                            label="Ad Soyad"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />

                        <Input
                            label="E-Posta Adresi"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />

                        <Input
                            label="Şifre"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />

                        <div style={{ marginTop: "1rem" }}>
                            <Button type="submit" variant="primary" fullWidth disabled={loading}>
                                {loading ? "Kayıt Yapılıyor..." : "Kayıt Ol"}
                            </Button>
                        </div>
                    </form>

                    <div style={{ marginTop: "1.5rem", textAlign: "center", fontSize: "0.9rem", color: "var(--muted)" }}>
                        Zaten hesabınız var mı?{" "}
                        <Link href="/login" style={{ color: "var(--primary)", fontWeight: 600 }}>
                            Giriş Yapın
                        </Link>
                    </div>
                </Card>
            </div>
        </div>
    );
}
