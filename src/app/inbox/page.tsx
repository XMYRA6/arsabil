"use client";

import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import styles from './inbox.module.css';

/* ─────────── types ─────────── */
type Status = 'sending' | 'sent' | 'delivered' | 'seen';

interface Message {
    id: string;
    text: string;
    mine: boolean;
    status?: Status;
    time: string;
}

interface Conversation {
    id: number;
    sender: { name: string; username: string; role: string; initials: string; color: string };
    lastMsg: string;
    unread: boolean;
    time: string;
    thread: Message[];
}

/* ─────────── helpers ─────────── */
const roleLabel = (role: string) =>
    role === 'CONTRACTOR' ? 'Müteahhit' : role === 'AGENT' ? 'Emlak Danışmanı' : 'Kullanıcı';

function Ticks({ status }: { status?: Status }) {
    if (!status) return null;
    if (status === 'sending') return <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.5)' }}>⏳</span>;
    if (status === 'sent')
        return <span title="Gönderildi" style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)' }}>✓</span>;
    if (status === 'delivered')
        return <span title="İletildi" style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', letterSpacing: '-2px' }}>✓✓</span>;
    return (
        <span title="Görüldü" style={{ fontSize: '0.7rem', color: '#fff', letterSpacing: '-2px', fontWeight: 900 }}>✓✓</span>
    );
}

/* ─────────── mock data ─────────── */
const INITIAL: Conversation[] = [
    {
        id: 1,
        sender: { name: 'Ahmet Yılmaz İnşaat', username: 'ahmet_insaat', role: 'CONTRACTOR', initials: 'AY', color: '#3b82f6' },
        lastMsg: "Merhaba, Söğütlü'deki %30 arsa paylı teklifinizi gördüm, detaylı konuşabilir miyiz?",
        unread: true,
        time: '8s',
        thread: [
            { id: 'a1', text: "Merhaba, Söğütlü'deki %30 arsa paylı teklifinizi gördüm, detaylı konuşabilir miyiz?", mine: false, time: '08:42' },
            { id: 'a2', text: 'Merhaba Ahmet Bey, tabii ki. Hangi konuyu önce ele almak istersiniz?', mine: true, status: 'seen', time: '08:44' },
            { id: 'a3', text: 'Emsal 2.5 ile mi hesapladınız? İmar durumu Konut + Ticaret mi?', mine: false, time: '08:46' },
        ],
    },
    {
        id: 2,
        sender: { name: 'Mehmet Demir', username: 'mdemir_arsalar', role: 'CONTRACTOR', initials: 'MD', color: '#10b981' },
        lastMsg: 'Kâr oranı ve daire paylaşım oranlarınız oldukça makul. Teklifinizi incelemek isterim.',
        unread: false,
        time: '1g',
        thread: [
            { id: 'b1', text: 'Kâr oranı ve daire paylaşım oranlarınız oldukça makul. Teklifinizi incelemek isterim.', mine: false, time: 'Dün 14:30' },
            { id: 'b2', text: 'Teşekkürler Mehmet Bey. Size tam hesaplama raporunu gönderebilirim.', mine: true, status: 'delivered', time: 'Dün 14:35' },
        ],
    },
    {
        id: 3,
        sender: { name: 'Fatma Çelik Gayrimenkul', username: 'fatma_celik', role: 'AGENT', initials: 'FÇ', color: '#8b5cf6' },
        lastMsg: 'Ankara Çankaya projenizle ilgileniyorum, detayları paylaşabilir misiniz?',
        unread: false,
        time: '2h',
        thread: [
            { id: 'c1', text: 'Ankara Çankaya projenizle ilgileniyorum, detayları paylaşabilir misiniz?', mine: false, time: '24 Şub 10:15' },
        ],
    },
];

export default function Inbox() {
    const [convs, setConvs] = useState<Conversation[]>(INITIAL);
    const [activeId, setActiveId] = useState<number | null>(null);
    const [draft, setDraft] = useState('');
    const [sending, setSending] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isMobileChatActive, setIsMobileChatActive] = useState(false);

    const bottomRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const active = convs.find(c => c.id === activeId);

    useEffect(() => {
        if (typeof window !== 'undefined' && window.innerWidth > 768 && !activeId) {
            setActiveId(1);
        }
    }, []);

    useEffect(() => {
        if (activeId) {
            setConvs(cs => cs.map(c => c.id === activeId ? { ...c, unread: false } : c));
        }
    }, [activeId]);

    useEffect(() => {
        if (active) {
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [active?.thread.length]);

    const selectConversation = (id: number) => {
        setActiveId(id);
        setIsMobileChatActive(true);
    };

    const backToList = () => {
        setIsMobileChatActive(false);
    };

    const sendMessage = async () => {
        if (!draft.trim() || !activeId) return;
        const msgId = `msg-${Date.now()}`;
        const newMsg: Message = {
            id: msgId,
            text: draft,
            mine: true,
            status: 'sending',
            time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        };

        setConvs(cs => cs.map(c =>
            c.id === activeId
                ? { ...c, thread: [...c.thread, newMsg], lastMsg: draft }
                : c
        ));
        setDraft('');
        setSending(true);

        await new Promise(r => setTimeout(r, 400));
        updateStatus(activeId, msgId, 'sent');
        await new Promise(r => setTimeout(r, 600));
        updateStatus(activeId, msgId, 'delivered');
        await new Promise(r => setTimeout(r, 1500));
        updateStatus(activeId, msgId, 'seen');
        setSending(false);
    };

    const updateStatus = (cId: number, mId: string, status: Status) => {
        setConvs(cs => cs.map(c =>
            c.id === cId
                ? { ...c, thread: c.thread.map(m => m.id === mId ? { ...m, status } : m) }
                : c
        ));
    };

    const handleKey = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    };

    const filteredConvs = convs.filter(c => 
        c.sender.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.sender.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.lastMsg.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const unreadCount = convs.filter(c => c.unread).length;

    return (
        <div className={styles.inboxContainer}>
            
            {/* Sidebar (Conversation List) */}
            <aside className={`${styles.sidebar} ${isMobileChatActive ? styles.sidebarHidden : ''}`}>
                <div className={styles.sidebarHeader}>
                    <div className={styles.sidebarTitleRow}>
                        <h2 className={styles.sidebarTitle}>Mesajlar</h2>
                    </div>
                    <div className={styles.searchBox}>
                        <span className={styles.searchIcon}>🔍</span>
                        <input 
                            className={styles.searchInput} 
                            placeholder="Ara" 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className={styles.convList}>
                    {filteredConvs.map(c => (
                        <div
                            key={c.id}
                            className={`${styles.convItem} ${c.id === activeId ? styles.convItemActive : ''}`}
                            onClick={() => selectConversation(c.id)}
                        >
                            <div className={`${styles.avatar} ${c.unread ? styles.avatarUnread : ''}`} style={{ width: 56, height: 56, background: c.sender.color }}>
                                <div style={{ width: '100%', height: '100%', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: c.sender.color }}>
                                    {c.sender.initials}
                                </div>
                            </div>
                            <div className={styles.convText}>
                                <div className={styles.convNameRow}>
                                    <span className={styles.convName}>{c.sender.name}</span>
                                </div>
                                <div className={`${styles.convLastMsg} ${c.unread ? styles.convUnreadText : ''}`}>
                                    {c.lastMsg} • {c.time}
                                </div>
                            </div>
                            {c.unread && <div style={{ width: 8, height: 8, background: 'var(--primary)', borderRadius: '50%', marginLeft: 'auto' }} />}
                        </div>
                    ))}
                </div>
            </aside>

            {/* Chat View */}
            <main className={`${styles.chatView} ${isMobileChatActive ? styles.chatViewActive : ''}`}>
                {active ? (
                    <>
                        <div className={styles.chatHeader}>
                            <button className={styles.backButton} onClick={backToList}>
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="15 18 9 12 15 6"></polyline>
                                </svg>
                            </button>
                            <div className={styles.avatar} style={{ width: 36, height: 36, fontSize: '0.75rem', background: active.sender.color }}>
                                {active.sender.initials}
                            </div>
                            <div className={styles.chatInfo}>
                                <div className={styles.chatName}>{active.sender.name}</div>
                                <div className={styles.chatStatus}>{roleLabel(active.sender.role)}</div>
                            </div>
                            <div style={{ display: 'flex', gap: 18, color: 'var(--text)' }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ cursor: 'pointer' }}>
                                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                                </svg>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ cursor: 'pointer' }}>
                                    <polygon points="23 7 16 12 23 17 23 7"></polygon>
                                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                                </svg>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ cursor: 'pointer' }}>
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <line x1="12" y1="8" x2="12" y2="12"></line>
                                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                                </svg>
                            </div>
                        </div>

                        <div className={styles.messagesArea}>
                            {active.thread.map(msg => (
                                <div key={msg.id} className={`${styles.messageRow} ${msg.mine ? styles.mine : styles.theirs}`}>
                                    <div className={`${styles.bubble} ${msg.mine ? styles.bubbleMine : styles.bubbleTheirs}`}>
                                        <div>{msg.text}</div>
                                        <div className={styles.msgMeta}>
                                            <span style={{ fontSize: '0.6rem' }}>{msg.time}</span>
                                            {msg.mine && <Ticks status={msg.status} />}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <div ref={bottomRef} />
                        </div>

                        <div className={styles.inputArea}>
                            <div className={styles.inputWrapper}>
                                <div style={{ display: 'flex', padding: '0 4px', gap: 12 }}>
                                     <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ cursor: 'pointer', color: 'var(--muted)' }}>
                                        <circle cx="12" cy="12" r="10"></circle>
                                        <path d="M12 8v8"></path>
                                        <path d="M8 12h8"></path>
                                    </svg>
                                </div>
                                <textarea
                                    ref={textareaRef}
                                    className={styles.textarea}
                                    placeholder="Mesaj gönder..."
                                    value={draft}
                                    onChange={e => setDraft(e.target.value)}
                                    onKeyDown={handleKey}
                                    rows={1}
                                />
                                {draft.trim() ? (
                                    <span onClick={sendMessage} style={{ color: 'var(--primary)', fontWeight: 800, cursor: 'pointer', padding: '0 8px', fontSize: '0.95rem' }}>Gönder</span>
                                ) : (
                                    <div style={{ display: 'flex', gap: 14, paddingRight: 4 }}>
                                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ cursor: 'pointer', color: 'var(--text)' }}>
                                            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                                            <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                                            <line x1="12" y1="19" x2="12" y2="23"></line>
                                            <line x1="8" y1="23" x2="16" y2="23"></line>
                                        </svg>
                                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ cursor: 'pointer', color: 'var(--text)' }}>
                                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                            <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                            <polyline points="21 15 16 10 5 21"></polyline>
                                        </svg>
                                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ cursor: 'pointer', color: 'var(--text)' }}>
                                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                                        </svg>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', opacity: 0.6 }}>
                         <div style={{ width: 96, height: 96, borderRadius: '50%', border: '2px solid currentColor', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                            </svg>
                         </div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--card-title)', letterSpacing: '-0.5px' }}>Mesajların</h3>
                        <p style={{ marginTop: 8, fontSize: '0.9rem', textAlign: 'center', maxWidth: 260 }}>Arkadaşına gizli bir fotoğraf veya mesaj gönder.</p>
                        <button style={{ marginTop: 24, background: 'var(--primary)', color: 'white', border: 'none', padding: '10px 24px', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>Mesaj Gönder</button>
                    </div>
                )}
            </main>
        </div>
    );
}
