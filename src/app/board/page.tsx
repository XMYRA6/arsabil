"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useSession } from "next-auth/react";
import { toast } from "react-hot-toast";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export default function BoardPage() {
    const { data: session } = useSession();
    const [listings, setListings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
    const [offerShare, setOfferShare] = useState<number>(30);
    const [offerMessage, setOfferMessage] = useState<string>("");
    const [submitting, setSubmitting] = useState(false);
    const [feedback, setFeedback] = useState("");

    useEffect(() => {
        fetch("/api/listings")
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setListings(data);
                } else {
                    console.error("Beklenmeyen veri:", data);
                    setListings([]);
                }
                setLoading(false);
            })
            .catch(console.error);
    }, []);

    const handleOfferSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const res = await fetch("/api/offers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    listingId: selectedListingId,
                    offeredShare: offerShare / 100, // Yüzdeyi ondalığa çevir (Örn %30 -> 0.30)
                    message: offerMessage
                })
            });

            const data = await res.json();
            if (res.ok) {
                toast.success("Teklif başarıyla gönderildi!");
                setTimeout(() => setSelectedListingId(null), 2000);
            } else {
                toast.error(data.message || "Hata oluştu.");
            }
        } catch (error) {
            toast.error("Bağlantı hatası.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return (
        <div style={{ padding: "4rem", minHeight: "50vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
            <LoadingSpinner />
        </div>
    );

    return (
        <div className="page-container">
            <div style={{ marginBottom: "2rem", textAlign: "center" }}>
                <h1 style={{ fontSize: "2.5rem", color: "var(--primary-color)", fontWeight: 700 }}>ArsaBil Pazar Yeri</h1>
                <p style={{ color: "var(--text-muted)", marginTop: "0.5rem" }}>Sistemdeki güncel arsaları inceleyin ve teklif verin.</p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.5rem" }}>
                {listings.length === 0 ? (
                    <div style={{ gridColumn: "1 / -1", textAlign: "center", color: "var(--text-muted)", padding: "3rem" }}>
                        Şu an aktif ilan bulunmamaktadır.
                    </div>
                ) : (
                    listings.map((listing) => (
                        <Card key={listing.id} title={`${listing.city || "Bilinmiyor"} / ${listing.district || "Bilinmiyor"}`}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                    <span style={{ color: "var(--text-muted)" }}>Arsa Sahibi:</span>
                                    <span style={{ fontWeight: 500 }}>{listing.user?.name || "Gizli Kullanıcı"}</span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                    <span style={{ color: "var(--text-muted)" }}>Toplam Daire:</span>
                                    <span style={{ fontWeight: 500 }}>{listing.report.totalApartments} Adet</span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                    <span style={{ color: "var(--text-muted)" }}>Daire M²:</span>
                                    <span style={{ fontWeight: 500 }}>{listing.report.apartmentSizeSqm} m²</span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                    <span style={{ color: "var(--text-muted)" }}>Piyasa Değeri (P):</span>
                                    <span style={{ fontWeight: 500 }}>₺{listing.report.minApartmentPrice.toLocaleString("tr-TR")}</span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                    <span style={{ color: "var(--text-muted)" }}>İstenen Pay (x):</span>
                                    <span style={{ fontWeight: 500, color: "var(--primary-color)" }}>%{(listing.report.landShareRatio * 100).toFixed(0)}</span>
                                </div>

                                {listing.notes && (
                                    <div style={{ marginTop: "1rem", padding: "0.75rem", backgroundColor: "var(--bg-color)", borderRadius: "var(--radius-sm)", fontSize: "0.9rem" }}>
                                        {listing.notes}
                                    </div>
                                )}

                                {session?.user?.id !== listing.userId && (
                                    <div style={{ marginTop: "1.5rem" }}>
                                        <Button fullWidth onClick={() => setSelectedListingId(listing.id)}>
                                            Teklif Karşılaştır / Gönder
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </Card>
                    ))
                )}
            </div>

            {/* Teklif Modalı */}
            {selectedListingId && (
                <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
                    <div style={{ backgroundColor: "white", padding: "2rem", borderRadius: "var(--radius-lg)", width: "100%", maxWidth: "400px", boxShadow: "var(--shadow-lg)" }}>
                        <h3 style={{ fontSize: "1.25rem", marginBottom: "1.5rem", fontWeight: 600 }}>Teklif Gönder</h3>
                        <form onSubmit={handleOfferSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

                            <div>
                                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--text-muted)" }}>
                                    Teklif Ettiğiniz Arsa Payı (%)
                                </label>
                                <input
                                    type="number"
                                    min="1" max="99"
                                    value={offerShare}
                                    onChange={(e) => setOfferShare(Number(e.target.value))}
                                    style={{ width: "100%", padding: "0.75rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}
                                />
                            </div>

                            <div>
                                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--text-muted)" }}>
                                    Ekstra Mesaj / Not (Opsiyonel)
                                </label>
                                <textarea
                                    value={offerMessage}
                                    onChange={(e) => setOfferMessage(e.target.value)}
                                    rows={3}
                                    style={{ width: "100%", padding: "0.75rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}
                                    placeholder="Merhaba, sizinle çalışmak isterim..."
                                />
                            </div>

                            {/* Toast ile ekrana verileceği için feedback labelını kaldırdık */}

                            <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
                                <Button type="button" variant="outline" fullWidth onClick={() => setSelectedListingId(null)}>İptal</Button>
                                <Button type="submit" variant="primary" fullWidth disabled={submitting}>Gönder</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
