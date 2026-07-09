'use client'

import React, { useEffect, useRef, useState, useCallback, Suspense } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'react-hot-toast'
import styles from './inbox.module.css'

interface OtherUser {
    id: string
    name: string | null
    image: string | null
}

interface Conversation {
    otherUser: OtherUser
    lastMessage: string
    lastMessageAt: string
    unreadCount: number
}

interface Message {
    id: string
    content: string
    senderId: string
    receiverId: string
    createdAt: string
    read: boolean
    reportId: string | null
    sender: OtherUser
}

function InboxContent() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const searchParams = useSearchParams()
    const [conversations, setConversations] = useState<Conversation[]>([])
    const [activeOtherId, setActiveOtherId] = useState<string | null>(null)
    const [messages, setMessages] = useState<Message[]>([])
    const [draft, setDraft] = useState('')
    const [sending, setSending] = useState(false)
    const [isMobileChatActive, setIsMobileChatActive] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const bottomRef = useRef<HTMLDivElement>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const activeOtherIdRef = useRef<string | null>(null)

    const currentUserId = (session?.user as { id?: string })?.id

    useEffect(() => {
        if (status === 'unauthenticated') router.push('/login')
    }, [status, router])

    useEffect(() => {
        if (status !== 'authenticated') return
        if (!currentUserId) return

        const es = new EventSource('/api/messages/sse')

        es.onmessage = (event: MessageEvent) => {
            const data = JSON.parse(event.data as string)

            if (data.type === 'init') {
                setConversations(data.conversations)
                return
            }

            if (data.type === 'new_message') {
                const msg = data.message as {
                    id: string; content: string; senderId: string; receiverId: string
                    createdAt: string; read: boolean; reportId: string | null
                    sender: { id: string; name: string | null; image: string | null }
                }
                const otherId = msg.senderId === currentUserId ? msg.receiverId : msg.senderId

                setConversations(prev => {
                    const exists = prev.some(c => c.otherUser.id === otherId)
                    if (exists) {
                        return prev.map(c =>
                            c.otherUser.id === otherId
                                ? {
                                    ...c,
                                    lastMessage:    msg.content,
                                    lastMessageAt:  msg.createdAt,
                                    unreadCount:
                                        msg.senderId !== currentUserId &&
                                        activeOtherIdRef.current !== otherId
                                            ? c.unreadCount + 1
                                            : c.unreadCount,
                                }
                                : c
                        )
                    }
                    return [
                        {
                            otherUser:      msg.sender,
                            lastMessage:    msg.content,
                            lastMessageAt:  msg.createdAt,
                            unreadCount:    msg.senderId !== currentUserId ? 1 : 0,
                        },
                        ...prev,
                    ]
                })

                if (
                    activeOtherIdRef.current === msg.senderId ||
                    activeOtherIdRef.current === msg.receiverId
                ) {
                    setMessages(prev => [...prev, msg])
                }
            }
        }

        es.onerror = () => {
            // EventSource auto-reconnects — no action needed
        }

        return () => es.close()
    }, [status, currentUserId])

    const loadMessages = useCallback(async (otherId: string) => {
        const res = await fetch(`/api/messages/${otherId}`)
        const data = await res.json()
        if (data.messages) setMessages(data.messages)
        setConversations(prev =>
            prev.map(c => c.otherUser.id === otherId ? { ...c, unreadCount: 0 } : c)
        )
    }, [])

    const openConversation = useCallback((otherId: string) => {
        setActiveOtherId(otherId)
        setIsMobileChatActive(true)
        loadMessages(otherId)
    }, [loadMessages])

    useEffect(() => {
        const withParam = searchParams.get('with')
        // eslint-disable-next-line react-hooks/set-state-in-effect -- URL parametresinden başlangıç konuşması açılıyor
        if (withParam && status === 'authenticated') openConversation(withParam)
    }, [searchParams, status, openConversation])

    useEffect(() => {
        if (typeof window !== 'undefined' && window.innerWidth > 768 && !activeOtherId && conversations.length > 0) {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- geniş ekranda otomatik ilk konuşma seçimi
            openConversation(conversations[0].otherUser.id)
        }
    }, [conversations, activeOtherId, openConversation])

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages.length])

    useEffect(() => {
        activeOtherIdRef.current = activeOtherId
    }, [activeOtherId])

    const sendMessage = async () => {
        if (!draft.trim() || !activeOtherId || sending) return
        setSending(true)
        const res = await fetch('/api/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ receiverId: activeOtherId, content: draft.trim() }),
        })
        if (res.ok) {
            setDraft('')
            await loadMessages(activeOtherId)
        } else {
            toast.error('Mesaj gönderilemedi')
        }
        setSending(false)
    }

    const handleKey = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
    }

    const activeConv = conversations.find(c => c.otherUser.id === activeOtherId)

    const filtered = conversations.filter(c =>
        (c.otherUser.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.lastMessage.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const avatarInitials = (name: string | null) => (name || 'U').slice(0, 2).toUpperCase()

    if (status === 'loading') return null

    return (
        <div className={styles.inboxContainer}>
            {/* Sidebar */}
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
                    {filtered.length === 0 && (
                        <div className={styles.emptyConvList}>
                            Henüz mesaj yok.
                        </div>
                    )}
                    {filtered.map(c => (
                        <div
                            key={c.otherUser.id}
                            className={`${styles.convItem} ${c.otherUser.id === activeOtherId ? styles.convItemActive : ''}`}
                            onClick={() => openConversation(c.otherUser.id)}
                        >
                            <div className={`${styles.avatar} ${styles.avatarSidebar}`}>
                                {avatarInitials(c.otherUser.name)}
                            </div>
                            <div className={styles.convText}>
                                <div className={styles.convNameRow}>
                                    <span className={styles.convName}>{c.otherUser.name || 'Kullanıcı'}</span>
                                </div>
                                <div className={`${styles.convLastMsg} ${c.unreadCount > 0 ? styles.convUnreadText : ''}`}>
                                    {c.lastMessage.length > 45 ? c.lastMessage.slice(0, 45) + '…' : c.lastMessage}
                                </div>
                            </div>
                            {c.unreadCount > 0 && (
                                <div className={styles.unreadCountBadge}>
                                    {c.unreadCount}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </aside>

            {/* Chat view */}
            <main className={`${styles.chatView} ${isMobileChatActive ? styles.chatViewActive : ''}`}>
                {activeConv ? (
                    <>
                        <div className={styles.chatHeader}>
                            <button className={styles.backButton} onClick={() => setIsMobileChatActive(false)} aria-label="Geri">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="15 18 9 12 15 6" />
                                </svg>
                            </button>
                            <div className={`${styles.avatar} ${styles.avatarChatHeader}`}>
                                {avatarInitials(activeConv.otherUser.name)}
                            </div>
                            <div className={styles.chatInfo}>
                                <div className={styles.chatName}>{activeConv.otherUser.name || 'Kullanıcı'}</div>
                            </div>
                        </div>

                        <div className={styles.messagesArea}>
                            {messages.map(msg => {
                                const isMine = msg.senderId === currentUserId
                                return (
                                    <div key={msg.id} className={`${styles.messageRow} ${isMine ? styles.mine : styles.theirs}`}>
                                        <div className={`${styles.bubble} ${isMine ? styles.bubbleMine : styles.bubbleTheirs}`}>
                                            <div>{msg.content}</div>
                                            <div className={styles.msgMeta}>
                                                <span className={styles.msgTimestamp}>
                                                    {new Date(msg.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                            <div ref={bottomRef} />
                        </div>

                        <div className={styles.inputArea}>
                            <div className={styles.inputWrapper}>
                                <textarea
                                    ref={textareaRef}
                                    className={styles.textarea}
                                    placeholder="Mesaj gönder..."
                                    value={draft}
                                    onChange={e => setDraft(e.target.value)}
                                    onKeyDown={handleKey}
                                    rows={1}
                                />
                                {draft.trim() && (
                                    <span
                                        onClick={sendMessage}
                                        className={`${styles.sendLink} ${sending ? styles.sendLinkDisabled : ''}`}
                                    >
                                        Gönder
                                    </span>
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className={styles.emptyChatState}>
                        <div className={styles.emptyChatIcon}>
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                            </svg>
                        </div>
                        <h3 className={styles.emptyChatTitle}>Mesajların</h3>
                        <p className={styles.emptyChatText}>Soldaki listeden bir konuşma seç.</p>
                    </div>
                )}
            </main>
        </div>
    )
}

export default function Inbox() {
    return (
        <Suspense fallback={null}>
            <InboxContent />
        </Suspense>
    )
}
