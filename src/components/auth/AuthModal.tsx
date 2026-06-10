"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

export function AuthModal({ isOpen, onClose, message }: { isOpen: boolean; onClose: () => void; message: string }) {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!isOpen || !mounted) return null;

    return createPortal(
        <>
            <style dangerouslySetInnerHTML={{
                __html: `
                .ios-sheet {
                    position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                    width: 90%; max-width: 420px; background: var(--panel);
                    border-radius: 30px; padding: 36px; z-index: 999999;
                    box-shadow: 0 30px 60px rgba(0,0,0,0.3), inset 0 1px 1px rgba(255,255,255,0.15);
                    border: 1px solid rgba(255,255,255,0.1);
                    backdrop-filter: blur(40px); -webkit-backdrop-filter: blur(40px);
                    display: flex; flex-direction: column; align-items: center; text-align: center;
                    animation: fadeSlideIn 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
                }
                @media (max-width: 768px) {
                    .ios-sheet {
                        top: auto; left: 0; bottom: 0; transform: none; width: 100%; max-width: 100%;
                        border-bottom-left-radius: 0; border-bottom-right-radius: 0;
                        padding-bottom: calc(36px + env(safe-area-inset-bottom, 20px));
                        animation: slideUpBottomSheet 0.45s cubic-bezier(0.2, 0.8, 0.2, 1);
                    }
                }
                @keyframes slideUpBottomSheet { 
                    from { transform: translateY(100%); opacity: 0; } 
                    to { transform: translateY(0); opacity: 1; } 
                }
            `}} />
            {/* Backdrop */}
            <div
                style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', zIndex: 999998, transition: 'all 0.4s ease' }}
                onClick={onClose}
            />
            {/* Modal / Bottom Sheet */}
            <div className="ios-sheet">
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
                        style={{ flex: 1, padding: '16px', borderRadius: '16px', background: 'rgba(255,255,255,0.05)', color: 'var(--text)', border: '1px solid rgba(255,255,255,0.1)', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.2,0.8,0.2,1)' }}
                        onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
                        onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                    >
                        Vazgeç
                    </button>
                    <button
                        onClick={() => { onClose(); router.push('/login'); }}
                        style={{ flex: 1, padding: '16px', borderRadius: '16px', background: 'linear-gradient(135deg, var(--primary), var(--primary-2))', color: 'white', border: 'none', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.2,0.8,0.2,1)', boxShadow: '0 8px 20px var(--primary-glow)' }}
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
