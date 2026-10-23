"use client";

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import styles from './page.module.css';

type PrefKey = 'mesaj' | 'teklif' | 'ilan';
type Prefs = Record<PrefKey, boolean>;

const PREFS: Array<{ key: PrefKey; label: string; desc: string }> = [
    { key: 'mesaj', label: 'Mesajlar', desc: 'Yeni mesaj geldiğinde e-posta al.' },
    { key: 'teklif', label: 'Teklifler', desc: 'İlanlarına gelen teklifleri kaçırma.' },
    { key: 'ilan', label: 'İlan durumu', desc: 'Onay ve yayın durumlarını takip et.' },
];

const DEFAULT_PREFS: Prefs = { mesaj: true, teklif: true, ilan: true };

export default function SettingsPage() {
    const { data: session, status } = useSession();
    const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (status !== 'authenticated' || !session?.user?.id) return;
        setLoading(true);
        fetch(`/api/user/profile/${session.user.id}`)
            .then(res => {
                if (!res.ok) throw new Error('settings fetch failed');
                return res.json();
            })
            .then(data => {
                if (!data.emailPrefs) return;
                try {
                    setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(data.emailPrefs) });
                } catch {
                    setPrefs(DEFAULT_PREFS);
                }
            })
            .catch(() => setError(true))
            .finally(() => setLoading(false));
    }, [status, session?.user?.id]);

    const toggle = (key: PrefKey) => setPrefs(prev => ({ ...prev, [key]: !prev[key] }));

    const save = async () => {
        setSaving(true);
        setSaved(false);
        setError(false);
        try {
            const res = await fetch('/api/user/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ emailPrefs: prefs }),
            });
            if (!res.ok) throw new Error('settings save failed');
            setSaved(true);
        } catch {
            setError(true);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <StateCard text="Ayarlar yükleniyor..." />;

    return (
        <main className={styles.shell}>
            <header className={styles.headRow}>
                <div className={styles.head}>
                    <h1>Bildirim tercihleri</h1>
                    <p>E-posta akışını sakin, seçilebilir ve hızlı güncellenebilir tut.</p>
                </div>
                <button type="button" onClick={save} disabled={saving} className={styles.btn}>
                    {saving ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
            </header>

            {error && <div className={styles.alert} role="alert">Ayarlar kaydedilemedi. Lütfen tekrar deneyin.</div>}
            {saved && <div className={styles.success} role="status">Ayarlar kaydedildi.</div>}

            <section className={`${styles.card} ${styles.toggleCard}`}>
                {PREFS.map(item => (
                    <button key={item.key} type="button" className={styles.toggleRow} onClick={() => toggle(item.key)} aria-pressed={prefs[item.key]}>
                        <span className={styles.toggleText}>
                            <strong>{item.label}</strong>
                            <small>{item.desc}</small>
                        </span>
                        <span className={`${styles.toggleSwitch} ${prefs[item.key] ? styles.toggleSwitchOn : ''}`}>
                            <span className={`${styles.toggleKnob} ${prefs[item.key] ? styles.toggleKnobOn : ''}`} />
                        </span>
                    </button>
                ))}
            </section>
        </main>
    );
}

function StateCard({ text }: { text: string }) {
    return (
        <main className={styles.shell}>
            <section className={styles.card} aria-live="polite">{text}</section>
        </main>
    );
}