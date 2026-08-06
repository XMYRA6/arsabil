"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import styles from "./AuthModal.module.css";

export function AuthModal({ isOpen, onClose, message }: { isOpen: boolean; onClose: () => void; message: string }) {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR hidrasyon koruması için mount flag
        setMounted(true);
    }, []);

    if (!isOpen || !mounted) return null;

    return createPortal(
        <>
            {/* Backdrop */}
            <div
                className={styles.backdrop}
                onClick={onClose}
            />
            {/* Modal / Bottom Sheet */}
            <div className={styles.sheet}>
                {/* iOS Drag Handle */}
                <div style={{ width: 44, height: 5, background: 'rgba(255,255,255,0.15)', borderRadius: 4, position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)' }} />
                
                <div style={{
                    width: '64px', height: '64px', borderRadius: '50%',
                    background: 'rgba(var(--primary-rgb), 0.1)', color: 'var(--primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: '20px', marginTop: '10px'
                }}>
                    <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                </div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--card-title)', marginBottom: '8px', letterSpacing: '-0.5px' }}>
                    Giriş Yapmanız Gerekiyor
                </h3>
                <p style={{ fontSize: '0.95rem', color: 'var(--muted)', marginBottom: '28px', lineHeight: 1.5 }}>
                    {message}
                </p>
                <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                    <button
                        onClick={onClose}
                        style={{ flex: 1, padding: '16px', borderRadius: '16px', background: 'rgba(255,255,255,0.05)', color: 'var(--text)', border: '1px solid rgba(255,255,255,0.1)', fontWeight: 700, cursor: 'pointer', transition: 'transform 0.2s var(--ease-out), box-shadow 0.2s var(--ease-out), background-color 0.2s var(--ease-out)' }}
                        onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
                        onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                    >
                        Vazgeç
                    </button>
                    <button
                        onClick={() => { onClose(); router.push('/login'); }}
                        style={{ flex: 1, padding: '16px', borderRadius: '16px', background: 'linear-gradient(135deg, var(--primary), var(--primary-2))', color: 'white', border: 'none', fontWeight: 800, cursor: 'pointer', transition: 'transform 0.2s var(--ease-out), box-shadow 0.2s var(--ease-out), background-color 0.2s var(--ease-out)', boxShadow: '0 8px 20px var(--primary-glow)' }}
                        onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
                        onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                    >
                        Giriş Yap
                    </button>
                </div>
            </div>
        </>,
        document.body
    );
}
