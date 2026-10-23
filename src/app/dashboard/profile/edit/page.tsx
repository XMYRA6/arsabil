"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import styles from './page.module.css';

type ProfileData = {
    bio: string | null;
    linkedin: string | null;
    website: string | null;
};

export default function ProfileEditPage() {
    const { data: session, status } = useSession();
    const [bio, setBio] = useState('');
    const [linkedin, setLinkedin] = useState('');
    const [website, setWebsite] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (status !== 'authenticated' || !session?.user?.id) return;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- oturum açılınca veri çekme; yükleme durumu fetch başında sıfırlanıyor
        setLoading(true);
        setError(false);
        fetch(`/api/user/profile/${session.user.id}`)
            .then(res => {
                if (!res.ok) throw new Error('profile fetch failed');
                return res.json();
            })
            .then((data: ProfileData) => {
                setBio(data.bio ?? '');
                setLinkedin(data.linkedin ?? '');
                setWebsite(data.website ?? '');
            })
            .catch(() => setError(true))
            .finally(() => setLoading(false));
    }, [status, session?.user?.id]);

    const save = async () => {
        setSaving(true);
        setSaved(false);
        setError(false);
        try {
            const res = await fetch('/api/user/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bio: bio || null, linkedin: linkedin || null, website: website || null }),
            });
            if (!res.ok) throw new Error('profile save failed');
            setSaved(true);
        } catch {
            setError(true);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <StateCard text="Profil yükleniyor..." />;

    return (
        <main className={styles.shell}>
            <header className={styles.head}>
                <h1>Bilgilerini güncelle</h1>
                <p>Hakkında metni ve profesyonel bağlantılarını portföy görünümüne taşı.</p>
            </header>

            {error && <div className={styles.alert} role="alert">İşlem tamamlanamadı. Lütfen tekrar deneyin.</div>}
            {saved && <div className={styles.success} role="status">Profil kaydedildi.</div>}

            <section className={`${styles.card} ${styles.formStack}`}>
                <label className={styles.field}>
                    <span>Hakkında</span>
                    <textarea value={bio} onChange={e => setBio(e.target.value)} maxLength={300} placeholder="Kendinizi ve uzmanlık alanınızı anlatın." />
                    <small className={styles.counter}>{bio.length} / 300</small>
                </label>
                <label className={styles.field}>
                    <span>LinkedIn</span>
                    <input value={linkedin} onChange={e => setLinkedin(e.target.value)} placeholder="https://linkedin.com/in/..." />
                </label>
                <label className={styles.field}>
                    <span>Website</span>
                    <input value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://..." />
                </label>
                <div className={styles.btnRow}>
                    <button type="button" onClick={save} disabled={saving} className={styles.btn}>
                        {saving ? 'Kaydediliyor...' : 'Kaydet'}
                    </button>
                    <Link href="/dashboard/profile" className={styles.btnSoft}>Vazgeç</Link>
                </div>
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
