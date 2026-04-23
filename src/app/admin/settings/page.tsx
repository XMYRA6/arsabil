"use client";

import { useEffect, useState } from "react";
import styles from '../admin.module.css';
import { Button } from "@/components/ui/Button";

interface ProfitLevel {
    id: string;
    label: string;
    value: number;
    sortOrder: number;
    isDefault: boolean;
}

interface RiskLevel {
    id: string;
    label: string;
    value: number;
    sortOrder: number;
    isDefault: boolean;
}

export default function AdminSettings() {
    // İksa Ayarları
    const [excavationLow, setExcavationLow] = useState(0.01);
    const [excavationMedium, setExcavationMedium] = useState(0.02);

    // Kalite Katsayıları
    const [qualityStandard, setQualityStandard] = useState(1.0);
    const [qualityMedium, setQualityMedium] = useState(1.2);
    const [qualityLux, setQualityLux] = useState(1.4);

    // Birim İnşaat Fiyatı (varsayılan)
    const [defaultUnitPrice, setDefaultUnitPrice] = useState(10000);

    // Müteahhit Kâr Katsayıları
    const [profitLevels, setProfitLevels] = useState<ProfitLevel[]>([]);
    const [profitLoading, setProfitLoading] = useState(true);

    // Risk Payı Katsayıları
    const [riskLevels, setRiskLevels] = useState<RiskLevel[]>([]);
    const [riskLoading, setRiskLoading] = useState(true);

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        // Global ayarları çek
        fetch('/api/settings')
            .then(r => r.json())
            .then(data => {
                if (data.excavationLowPercent) setExcavationLow(data.excavationLowPercent);
                if (data.excavationMediumPercent) setExcavationMedium(data.excavationMediumPercent);
                if (data.qualityStandard) setQualityStandard(data.qualityStandard);
                if (data.qualityMedium) setQualityMedium(data.qualityMedium);
                if (data.qualityLux) setQualityLux(data.qualityLux);
                if (data.defaultUnitPrice) setDefaultUnitPrice(data.defaultUnitPrice);
            })
            .catch(console.error);

        // Kâr katsayılarını çek
        fetchProfitLevels();
        // Risk seviyelerini çek
        fetchRiskLevels();
    }, []);

    const fetchProfitLevels = async () => {
        setProfitLoading(true);
        try {
            const res = await fetch('/api/settings/profit-levels');
            const data = await res.json();
            if (Array.isArray(data)) {
                setProfitLevels(data);
            } else {
                console.error("Profit levels API did not return an array:", data);
            }
        } catch (error) {
            console.error("Kâr katsayıları getirilemedi:", error);
        } finally {
            setProfitLoading(false);
        }
    };

    const fetchRiskLevels = async () => {
        setRiskLoading(true);
        try {
            const res = await fetch('/api/settings/risk-levels');
            const data = await res.json();
            if (Array.isArray(data)) {
                setRiskLevels(data);
            } else {
                console.error("Risk levels API did not return an array:", data);
            }
        } catch (error) {
            console.error("Risk seviyeleri getirilemedi:", error);
        } finally {
            setRiskLoading(false);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        setMessage(null);
        try {
            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    excavationLowPercent: excavationLow,
                    excavationMediumPercent: excavationMedium,
                    qualityStandard,
                    qualityMedium,
                    qualityLux,
                    defaultUnitPrice,
                }),
            });
            if (res.ok) {
                setMessage({ type: 'success', text: 'Ayarlar başarıyla güncellendi.' });
            } else {
                const data = await res.json();
                setMessage({ type: 'error', text: data.message || 'Hata oluştu.' });
            }
        } catch {
            setMessage({ type: 'error', text: 'Sunucu hatası.' });
        } finally {
            setLoading(false);
        }
    };

    // === Kâr Katsayıları CRUD ===

    const handleProfitLevelChange = (index: number, field: keyof ProfitLevel, val: string | number | boolean) => {
        setProfitLevels(prev => {
            const updated = [...prev];
            if (field === 'isDefault' && val === true) {
                // Sadece bir tane varsayılan olabilir
                updated.forEach((l, i) => { updated[i] = { ...l, isDefault: i === index }; });
            } else {
                updated[index] = { ...updated[index], [field]: val };
            }
            return updated;
        });
    };

    const handleAddLevel = () => {
        const maxOrder = profitLevels.reduce((max, l) => Math.max(max, l.sortOrder), -1);
        setProfitLevels(prev => [...prev, {
            id: `new-${Date.now()}`,
            label: '',
            value: 1.0,
            sortOrder: maxOrder + 1,
            isDefault: false,
        }]);
    };

    const handleDeleteLevel = async (index: number) => {
        const level = profitLevels[index];

        if (profitLevels.length <= 1) {
            setMessage({ type: 'error', text: 'En az bir kâr katsayısı kalmalıdır.' });
            return;
        }

        // Yeni eklenen ama henüz kaydedilmemiş
        if (level.id.startsWith('new-')) {
            setProfitLevels(prev => prev.filter((_, i) => i !== index));
            return;
        }

        try {
            const res = await fetch('/api/settings/profit-levels', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: level.id }),
            });
            if (res.ok) {
                setProfitLevels(prev => prev.filter((_, i) => i !== index));
                setMessage({ type: 'success', text: `"${level.label}" silindi.` });
            } else {
                const data = await res.json();
                setMessage({ type: 'error', text: data.message || 'Silme hatası.' });
            }
        } catch {
            setMessage({ type: 'error', text: 'Silme sırasında hata oluştu.' });
        }
    };

    const handleSaveProfitLevels = async () => {
        setLoading(true);
        setMessage(null);
        try {
            // Yeni olanları ayrı ekle
            const newLevels = profitLevels.filter(l => l.id.startsWith('new-'));
            const existingLevels = profitLevels.filter(l => !l.id.startsWith('new-'));

            // Sıralamayı güncelle
            existingLevels.forEach((l, i) => { l.sortOrder = i; });

            // Mevcut olanları toplu güncelle
            if (existingLevels.length > 0) {
                const putRes = await fetch('/api/settings/profit-levels', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ levels: existingLevels }),
                });
                if (!putRes.ok) {
                    const data = await putRes.json();
                    setMessage({ type: 'error', text: data.message || 'Güncelleme hatası.' });
                    setLoading(false);
                    return;
                }
            }

            // Yeni olanları tek tek ekle
            for (const level of newLevels) {
                const postRes = await fetch('/api/settings/profit-levels', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        label: level.label,
                        value: level.value,
                        sortOrder: level.sortOrder,
                        isDefault: level.isDefault,
                    }),
                });
                if (!postRes.ok) {
                    const data = await postRes.json();
                    setMessage({ type: 'error', text: data.message || 'Ekleme hatası.' });
                    setLoading(false);
                    return;
                }
            }

            setMessage({ type: 'success', text: 'Kâr katsayıları güncellendi.' });
            // Yeniden çek (ID'leri güncellemek için)
            await fetchProfitLevels();
        } catch {
            setMessage({ type: 'error', text: 'Katsayılar kaydedilirken hata oluştu.' });
        } finally {
            setLoading(false);
        }
    };

    const moveLevelUp = (index: number) => {
        if (index === 0) return;
        setProfitLevels(prev => {
            const updated = [...prev];
            [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
            updated.forEach((l, i) => { l.sortOrder = i; });
            return updated;
        });
    };

    const moveLevelDown = (index: number) => {
        if (index >= profitLevels.length - 1) return;
        setProfitLevels(prev => {
            const updated = [...prev];
            [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
            updated.forEach((l, i) => { l.sortOrder = i; });
            return updated;
        });
    };

    // === Risk Seviyeleri CRUD ===

    const handleRiskLevelChange = (index: number, field: keyof RiskLevel, val: string | number | boolean) => {
        setRiskLevels(prev => {
            const updated = [...prev];
            if (field === 'isDefault' && val === true) {
                updated.forEach((l, i) => { updated[i] = { ...l, isDefault: i === index }; });
            } else {
                updated[index] = { ...updated[index], [field]: val };
            }
            return updated;
        });
    };

    const handleAddRiskLevel = () => {
        const maxOrder = riskLevels.reduce((max, l) => Math.max(max, l.sortOrder), -1);
        setRiskLevels(prev => [...prev, {
            id: `new-${Date.now()}`,
            label: '',
            value: 0,
            sortOrder: maxOrder + 1,
            isDefault: false,
        }]);
    };

    const handleDeleteRiskLevel = async (index: number) => {
        const level = riskLevels[index];
        if (riskLevels.length <= 1) {
            setMessage({ type: 'error', text: 'En az bir risk seviyesi kalmalıdır.' });
            return;
        }
        if (level.id.startsWith('new-')) {
            setRiskLevels(prev => prev.filter((_, i) => i !== index));
            return;
        }
        try {
            const res = await fetch('/api/settings/risk-levels', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: level.id }),
            });
            if (res.ok) {
                setRiskLevels(prev => prev.filter((_, i) => i !== index));
                setMessage({ type: 'success', text: `"${level.label}" (Risk) silindi.` });
            } else {
                const data = await res.json();
                setMessage({ type: 'error', text: data.message || 'Silme hatası.' });
            }
        } catch {
            setMessage({ type: 'error', text: 'Silme sırasında hata oluştu.' });
        }
    };

    const handleSaveRiskLevels = async () => {
        setLoading(true);
        setMessage(null);
        try {
            const newLevels = riskLevels.filter(l => l.id.startsWith('new-'));
            const existingLevels = riskLevels.filter(l => !l.id.startsWith('new-'));
            existingLevels.forEach((l, i) => { l.sortOrder = i; });

            if (existingLevels.length > 0) {
                const putRes = await fetch('/api/settings/risk-levels', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ levels: existingLevels }),
                });
                if (!putRes.ok) {
                    const data = await putRes.json();
                    setMessage({ type: 'error', text: data.message || 'Güncelleme hatası.' });
                    setLoading(false);
                    return;
                }
            }

            for (const level of newLevels) {
                const postRes = await fetch('/api/settings/risk-levels', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        label: level.label,
                        value: level.value,
                        sortOrder: level.sortOrder,
                        isDefault: level.isDefault,
                    }),
                });
                if (!postRes.ok) {
                    const data = await postRes.json();
                    setMessage({ type: 'error', text: data.message || 'Ekleme hatası.' });
                    setLoading(false);
                    return;
                }
            }

            setMessage({ type: 'success', text: 'Risk seviyeleri güncellendi.' });
            await fetchRiskLevels();
        } catch {
            setMessage({ type: 'error', text: 'Risk seviyeleri kaydedilirken hata oluştu.' });
        } finally {
            setLoading(false);
        }
    };

    const moveRiskLevelUp = (index: number) => {
        if (index === 0) return;
        setRiskLevels(prev => {
            const updated = [...prev];
            [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
            updated.forEach((l, i) => { l.sortOrder = i; });
            return updated;
        });
    };

    const moveRiskLevelDown = (index: number) => {
        if (index >= riskLevels.length - 1) return;
        setRiskLevels(prev => {
            const updated = [...prev];
            [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
            updated.forEach((l, i) => { l.sortOrder = i; });
            return updated;
        });
    };

    return (
        <>
            <div className={styles.pageHeader}>
                <h1>Motor Ayarları</h1>
                <p>Hesaplama motorunun global katsayılarını yönetin</p>
            </div>

            {message && (
                <div className={message.type === 'success' ? styles.successMsg : styles.errorMsg}>
                    {message.text}
                </div>
            )}

            {/* Müteahhit Kâr Katsayıları — CRUD */}
            <div className={styles.settingsCard}>
                <h3>📊 Müteahhit Kâr Katsayıları (K)</h3>

                {profitLoading ? (
                    <div style={{ padding: '1rem', color: 'var(--muted)', textAlign: 'center' }}>Yükleniyor...</div>
                ) : (
                    <>
                        <div className={styles.profitLevelHeader}>
                            <span>Etiket</span>
                            <span>Katsayı</span>
                            <span>Sıra</span>
                            <span>Vars.</span>
                            <span>İşlem</span>
                        </div>

                        {profitLevels.map((level, i) => (
                            <div key={level.id} className={styles.profitLevelRow}>
                                <input
                                    type="text"
                                    value={level.label}
                                    placeholder="Etiket adı"
                                    onChange={e => handleProfitLevelChange(i, 'label', e.target.value)}
                                />
                                <input
                                    type="number"
                                    step="0.01"
                                    value={level.value}
                                    onChange={e => handleProfitLevelChange(i, 'value', Number(e.target.value))}
                                />
                                <div style={{ display: 'flex', gap: '2px' }}>
                                    <button className={styles.iconBtn} onClick={() => moveLevelUp(i)} disabled={i === 0} title="Yukarı">↑</button>
                                    <button className={styles.iconBtn} onClick={() => moveLevelDown(i)} disabled={i === profitLevels.length - 1} title="Aşağı">↓</button>
                                </div>
                                <button
                                    className={`${styles.defaultBadge} ${level.isDefault ? styles.defaultBadgeActive : ''}`}
                                    onClick={() => handleProfitLevelChange(i, 'isDefault', true)}
                                    title="Varsayılan yap"
                                >
                                    {level.isDefault ? '⭐' : '☆'}
                                </button>
                                <button
                                    className={styles.deleteBtn}
                                    onClick={() => handleDeleteLevel(i)}
                                    title="Sil"
                                >
                                    🗑️
                                </button>
                            </div>
                        ))}

                        <button className={styles.addLevelBtn} onClick={handleAddLevel}>
                            + Yeni Seviye Ekle
                        </button>

                        <div style={{ marginTop: '1rem' }}>
                            <Button variant="primary" onClick={handleSaveProfitLevels} disabled={loading}>
                                {loading ? 'Kaydediliyor...' : '💾 Kâr Katsayılarını Kaydet'}
                            </Button>
                        </div>
                    </>
                )}
            </div>

            {/* Risk Payı Katsayıları — CRUD */}
            <div className={styles.settingsCard}>
                <h3>🛡️ Risk Payı Katsayıları (R)</h3>

                {riskLoading ? (
                    <div style={{ padding: '1rem', color: 'var(--muted)', textAlign: 'center' }}>Yükleniyor...</div>
                ) : (
                    <>
                        <div className={styles.profitLevelHeader}>
                            <span>Etiket</span>
                            <span>Değer (%)</span>
                            <span>Sıra</span>
                            <span>Vars.</span>
                            <span>İşlem</span>
                        </div>

                        {riskLevels.map((level, i) => (
                            <div key={level.id} className={styles.profitLevelRow}>
                                <input
                                    type="text"
                                    value={level.label}
                                    placeholder="Etiket adı"
                                    onChange={e => handleRiskLevelChange(i, 'label', e.target.value)}
                                />
                                <input
                                    type="number"
                                    step="1"
                                    value={level.value}
                                    onChange={e => handleRiskLevelChange(i, 'value', Number(e.target.value))}
                                />
                                <div style={{ display: 'flex', gap: '2px' }}>
                                    <button className={styles.iconBtn} onClick={() => moveRiskLevelUp(i)} disabled={i === 0} title="Yukarı">↑</button>
                                    <button className={styles.iconBtn} onClick={() => moveRiskLevelDown(i)} disabled={i === riskLevels.length - 1} title="Aşağı">↓</button>
                                </div>
                                <button
                                    className={`${styles.defaultBadge} ${level.isDefault ? styles.defaultBadgeActive : ''}`}
                                    onClick={() => handleRiskLevelChange(i, 'isDefault', true)}
                                    title="Varsayılan yap"
                                >
                                    {level.isDefault ? '⭐' : '☆'}
                                </button>
                                <button
                                    className={styles.deleteBtn}
                                    onClick={() => handleDeleteRiskLevel(i)}
                                    title="Sil"
                                >
                                    🗑️
                                </button>
                            </div>
                        ))}

                        <button className={styles.addLevelBtn} onClick={handleAddRiskLevel}>
                            + Yeni Risk Seviyesi Ekle
                        </button>

                        <div style={{ marginTop: '1rem' }}>
                            <Button variant="primary" onClick={handleSaveRiskLevels} disabled={loading}>
                                {loading ? 'Kaydediliyor...' : '💾 Risk Katsayılarını Kaydet'}
                            </Button>
                        </div>
                    </>
                )}
            </div>

            <div className={styles.settingsCard}>
                <h3>📐 İksa Maliyeti Katsayıları</h3>
                <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                        <label>Düşük İksa Oranı (Z)</label>
                        <input type="number" step="0.001" value={excavationLow} onChange={e => setExcavationLow(Number(e.target.value))} />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Orta İksa Oranı (Z)</label>
                        <input type="number" step="0.001" value={excavationMedium} onChange={e => setExcavationMedium(Number(e.target.value))} />
                    </div>
                </div>
            </div>

            <div className={styles.settingsCard}>
                <h3>🏠 Kalite Sınıfı Katsayıları (L)</h3>
                <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                        <label>Standart</label>
                        <input type="number" step="0.1" value={qualityStandard} onChange={e => setQualityStandard(Number(e.target.value))} />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Orta</label>
                        <input type="number" step="0.1" value={qualityMedium} onChange={e => setQualityMedium(Number(e.target.value))} />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Lüks</label>
                        <input type="number" step="0.1" value={qualityLux} onChange={e => setQualityLux(Number(e.target.value))} />
                    </div>
                </div>
            </div>

            <div className={styles.settingsCard}>
                <h3>💰 Birim İnşaat Fiyatı (P)</h3>
                <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                        <label>Varsayılan Birim Fiyat (TL/m²)</label>
                        <input type="number" value={defaultUnitPrice} onChange={e => setDefaultUnitPrice(Number(e.target.value))} />
                    </div>
                </div>
            </div>

            <Button variant="primary" onClick={handleSave} disabled={loading}>
                {loading ? 'Kaydediliyor...' : '💾 Genel Ayarları Kaydet'}
            </Button>
        </>
    );
}
