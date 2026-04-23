"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { toast } from "react-hot-toast";
import styles from './dashboard.module.css';

export default function DashboardPage() {
    const { data: session, status } = useSession();
    const [reports, setReports] = useState<any[]>([]);
    const [myListings, setMyListings] = useState<any[]>([]);
    const [myOffers, setMyOffers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // ===== MULTI-ROLE BADGE STATE =====
    const ROLE_OPTIONS = [
        { id: 'ARSA_SAHIBI', label: 'Arsa Sahibi', icon: '🌄', color: '#10b981', bg: 'rgba(16,185,129,.12)' },
        { id: 'MUTEAHHIT', label: 'Müteahhit', icon: '🏗️', color: '#3b82f6', bg: 'rgba(59,130,246,.12)' },
        { id: 'DANISMAN', label: 'Emlak Danışmanı', icon: '🏠', color: '#8b5cf6', bg: 'rgba(139,92,246,.12)' },
        { id: 'YATIRIMCI', label: 'Yatırımcı', icon: '💰', color: '#f59e0b', bg: 'rgba(245,158,11,.12)' },
    ];
    const [selectedRoles, setSelectedRoles] = useState<string[]>(() => {
        if (typeof window === 'undefined') return [];
        try { return JSON.parse(localStorage.getItem('arsabil-roles') || '[]'); } catch { return []; }
    });
    const toggleRole = (id: string) => {
        setSelectedRoles(prev => {
            const next = prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id];
            localStorage.setItem('arsabil-roles', JSON.stringify(next));
            return next;
        });
    };


    const fetchData = async () => {
        try {
            const res = await fetch("/api/user/dashboard");
            const data = await res.json();
            setReports(data.reports || []);
            setMyListings(data.myListings || []);
            setMyOffers(data.myOffers || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (status === "authenticated") fetchData();
    }, [status]);

    const handleCreateListing = async (reportId: string) => {
        if (!confirm("Bu raporu genel ilan havuzuna eklemek istiyor musunuz?")) return;
        try {
            const res = await fetch("/api/listings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reportId, city: "Belirtilmedi", district: "Belirtilmedi", notes: "" }),
            });
            if (res.ok) { toast.success("İlan havuzda yayınlandı!"); fetchData(); }
            else { const d = await res.json(); toast.error(d.message || "Hata."); }
        } catch { toast.error("Bağlantı hatası."); }
    };

    const handleOfferResponse = async (offerId: string, offerStatus: "ACCEPTED" | "REJECTED") => {
        if (!confirm(`Teklifi ${offerStatus === "ACCEPTED" ? "KABUL" : "RED"} etmek istiyor musunuz?`)) return;
        try {
            const res = await fetch(`/api/offers/${offerId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: offerStatus }),
            });
            if (res.ok) { toast.success(offerStatus === "ACCEPTED" ? "Teklif onaylandı." : "Teklif reddedildi."); fetchData(); }
            else { const d = await res.json(); toast.error(d.message || "Hata."); }
        } catch { toast.error("Bağlantı hatası."); }
    };

    if (loading) return <div className={styles.loading}>Yükleniyor...</div>;
    if (!session) return null;

    return (
        <>
            <div className={styles.pageHeader}>
                <h1>Hoş Geldiniz, {session.user.name || 'Kullanıcı'} 👋</h1>
                {/* Active role badges inline */}
                {selectedRoles.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                        {ROLE_OPTIONS.filter(r => selectedRoles.includes(r.id)).map(r => (
                            <span key={r.id} style={{
                                display: 'inline-flex', alignItems: 'center', gap: 5,
                                background: r.bg, color: r.color,
                                border: `1.5px solid ${r.color}55`,
                                borderRadius: 20, padding: '3px 10px',
                                fontSize: '0.75rem', fontWeight: 800,
                            }}>
                                {r.icon} {r.label}
                            </span>
                        ))}
                    </div>
                )}
                <p style={{ marginTop: 6 }}>Hesaplamalarınızı, ilanlarınızı ve tekliflerinizi buradan yönetin</p>
            </div>

            {/* ===== ROL SEÇİCİ ===== */}
            <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.08em', marginBottom: 12 }}>
                    PROFİL ROLÜ — birden fazla seçebilirsiniz
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: 10 }}>
                    {ROLE_OPTIONS.map(role => {
                        const active = selectedRoles.includes(role.id);
                        return (
                            <button
                                key={role.id}
                                onClick={() => toggleRole(role.id)}
                                style={{
                                    padding: '14px 12px',
                                    background: active ? role.bg : 'var(--panel)',
                                    border: active ? `2px solid ${role.color}` : '1.5px solid var(--border)',
                                    borderRadius: 14,
                                    cursor: 'pointer',
                                    display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6,
                                    transition: 'all 0.18s',
                                    fontFamily: 'inherit',
                                    textAlign: 'left',
                                    boxShadow: active ? `0 4px 20px ${role.color}30` : 'var(--shadow2)',
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                                    <span style={{ fontSize: '1.4rem' }}>{role.icon}</span>
                                    <span style={{
                                        width: 18, height: 18, borderRadius: '50%',
                                        border: active ? `2px solid ${role.color}` : '2px solid var(--border)',
                                        background: active ? role.color : 'transparent',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        transition: 'all 0.18s', flexShrink: 0,
                                    }}>
                                        {active && <span style={{ color: 'white', fontSize: '0.6rem', fontWeight: 900 }}>✓</span>}
                                    </span>
                                </div>
                                <span style={{ fontSize: '0.82rem', fontWeight: active ? 800 : 600, color: active ? role.color : 'var(--card-title)' }}>
                                    {role.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Stats */}
            <div className={styles.statsGrid}>
                <div className={styles.statBox}>
                    <div className={styles.icon}>📄</div>
                    <div className={styles.value}>{reports.length}</div>
                    <div className={styles.label}>Rapor</div>
                </div>
                <div className={styles.statBox}>
                    <div className={styles.icon}>🏗️</div>
                    <div className={styles.value}>{myListings.length}</div>
                    <div className={styles.label}>İlan</div>
                </div>
                <div className={styles.statBox}>
                    <div className={styles.icon}>📩</div>
                    <div className={styles.value}>{myOffers.length}</div>
                    <div className={styles.label}>Teklif</div>
                </div>
            </div>

            {/* Raporlar */}
            <div className={styles.section}>
                <h2 className={styles.sectionTitle}>📄 Hesaplamalarım</h2>
                {reports.length === 0 ? (
                    <div className={styles.emptyState}>
                        <div className={styles.emptyIcon}>📊</div>
                        Henüz kayıtlı hesaplamanız yok. Hesap makinesinden rapor oluşturun.
                    </div>
                ) : (
                    <div className={styles.cardsGrid}>
                        {reports.map(report => (
                            <div key={report.id} className={styles.reportCard}>
                                <h4>{report.title}</h4>
                                <div className={styles.reportMeta}>
                                    <div><strong>Toplam Daire:</strong> {report.totalApartments}</div>
                                    <div><strong>Arsa Payı:</strong> %{(report.landShareRatio * 100).toFixed(0)}</div>
                                    <div><strong>Daire Fiyatı:</strong> ₺{report.minApartmentPrice.toLocaleString("tr-TR")}</div>
                                </div>
                                {!report.listing ? (
                                    <Button variant="outline" fullWidth onClick={() => handleCreateListing(report.id)}>
                                        Havuzda İlana Çıkar
                                    </Button>
                                ) : (
                                    <div style={{ padding: '0.5rem', background: 'rgba(31,111,235,0.08)', textAlign: 'center', borderRadius: '10px', color: 'var(--primary)', fontWeight: 700, fontSize: '0.85rem' }}>
                                        ✓ İlanda
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* İlanlar */}
            <div className={styles.section}>
                <h2 className={styles.sectionTitle}>🏗️ İlanlarım ve Teklifler</h2>
                {myListings.length === 0 ? (
                    <div className={styles.emptyState}>
                        <div className={styles.emptyIcon}>🏗️</div>
                        Yayında olan ilanınız bulunmuyor.
                    </div>
                ) : (
                    myListings.map(listing => (
                        <div key={listing.id} className={styles.listingCard}>
                            <div className={styles.listingHeader}>
                                <h4>{listing.report.title} İlanı</h4>
                                <span className={`${styles.statusBadge} ${listing.isActive ? styles.statusActive : styles.statusClosed}`}>
                                    {listing.isActive ? "Aktif" : "Kapalı"}
                                </span>
                            </div>
                            <h5 style={{ color: 'var(--muted)', fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                                Gelen Teklifler ({listing.offers.length})
                            </h5>
                            {listing.offers.length === 0 ? (
                                <div style={{ color: 'var(--muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>Henüz teklif gelmedi.</div>
                            ) : (
                                listing.offers.map((offer: any) => (
                                    <div key={offer.id} className={styles.offerRow}>
                                        <div className={styles.offerInfo}>
                                            <span className={styles.offerMain}>%{(offer.offeredShare * 100).toFixed(0)} Arsa Payı</span>
                                            <span className={styles.offerSub}>{offer.bidder.name} — {offer.message || "Mesaj yok"}</span>
                                        </div>
                                        {offer.status === "PENDING" && listing.isActive ? (
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <Button variant="outline" onClick={() => handleOfferResponse(offer.id, "REJECTED")}>Reddet</Button>
                                                <Button variant="primary" onClick={() => handleOfferResponse(offer.id, "ACCEPTED")}>Kabul</Button>
                                            </div>
                                        ) : (
                                            <span style={{ fontWeight: 700, color: offer.status === "ACCEPTED" ? 'var(--green)' : 'var(--red)', fontSize: '0.85rem' }}>
                                                {offer.status === "ACCEPTED" ? "✓ Onaylandı" : "✗ Reddedildi"}
                                            </span>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Yaptığım Teklifler */}
            <div className={styles.section}>
                <h2 className={styles.sectionTitle}>📩 Yaptığım Teklifler</h2>
                {myOffers.length === 0 ? (
                    <div className={styles.emptyState}>
                        <div className={styles.emptyIcon}>📩</div>
                        Henüz teklif vermediniz. Pazar Yeri&apos;ne göz atın.
                    </div>
                ) : (
                    <div className={styles.cardsGrid}>
                        {myOffers.map(offer => (
                            <div key={offer.id} className={styles.reportCard}>
                                <h4>{offer.listing.user?.name} İlanı</h4>
                                <div className={styles.reportMeta}>
                                    <div><strong>Teklifim:</strong> %{(offer.offeredShare * 100).toFixed(0)} Arsa Payı</div>
                                    <div><strong>Durum:</strong>{' '}
                                        <span style={{ fontWeight: 700, color: offer.status === "ACCEPTED" ? 'var(--green)' : offer.status === "REJECTED" ? 'var(--red)' : 'var(--primary)' }}>
                                            {offer.status === "ACCEPTED" ? "Onaylandı" : offer.status === "REJECTED" ? "Reddedildi" : "Bekliyor"}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}
