'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { toast } from 'react-hot-toast'
import styles from './page.module.css'

type Message = {
    id: string
    content: string
    senderId: string
    receiverId: string
    createdAt: string
    read: boolean
    sender: { id: string; name: string | null; image: string | null }
}

export default function MobileChatPage() {
    const params = useParams<{ userId: string }>()
    const userId = params.userId
    const router = useRouter()
    const { data: session, status } = useSession()
    const [messages, setMessages] = useState<Message[]>([])
    const [draft, setDraft] = useState('')
    const [loading, setLoading] = useState(true)
    const [sending, setSending] = useState(false)
    const bottomRef = useRef<HTMLDivElement>(null)
    const currentUserId = (session?.user as { id?: string })?.id

    useEffect(() => {
        if (status === 'unauthenticated') router.push('/login')
    }, [router, status])

    useEffect(() => {
        if (status !== 'authenticated' || !userId) return
        let cancelled = false
        setLoading(true)
        fetch(`/api/messages/${userId}`)
            .then(res => (res.ok ? res.json() : Promise.reject(new Error('messages failed'))))
            .then(data => {
                if (!cancelled) setMessages(data.messages ?? [])
            })
            .catch(() => {
                if (!cancelled) toast.error('Mesajlar yüklenemedi')
            })
            .finally(() => {
                if (!cancelled) setLoading(false)
            })
        return () => { cancelled = true }
    }, [status, userId])

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages.length])

    const otherName = messages.find(m => m.senderId === userId)?.sender.name || 'Sohbet'

    const sendMessage = async () => {
        const content = draft.trim()
        if (!content || sending) return
        setSending(true)
        const res = await fetch('/api/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ receiverId: userId, content }),
        })
        if (res.ok) {
            setDraft('')
            const data = await fetch(`/api/messages/${userId}`).then(r => r.json())
            setMessages(data.messages ?? [])
        } else {
            toast.error('Mesaj gönderilemedi')
        }
        setSending(false)
    }

    const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            sendMessage()
        }
    }

    return (
        <main className={styles.chatShell}>
            <header className={styles.chatTopbar}>
                <Link href="/inbox" className={styles.backLink} aria-label="Mesajlara dön">‹</Link>
                <div>
                    <p className={styles.kicker}>Mesaj</p>
                    <h1 className={styles.title}>{otherName}</h1>
                </div>
            </header>

            <section className={styles.messagePane} aria-live="polite">
                {loading ? (
                    <p className={styles.stateCard}>Mesajlar yükleniyor...</p>
                ) : messages.length === 0 ? (
                    <p className={styles.stateCard}>Bu sohbette henüz mesaj yok.</p>
                ) : messages.map(message => {
                    const mine = message.senderId === currentUserId
                    return (
                        <article key={message.id} className={`${styles.messageRow} ${mine ? styles.mine : styles.theirs}`}>
                            <div className={`${styles.bubble} ${mine ? styles.bubbleMine : styles.bubbleTheirs}`}>
                                <p>{message.content}</p>
                                <time>{new Date(message.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</time>
                            </div>
                        </article>
                    )
                })}
                <div ref={bottomRef} />
            </section>

            <form className={styles.composer} onSubmit={(event) => { event.preventDefault(); sendMessage() }}>
                <div className={styles.composerInner}>
                    <textarea
                        className={styles.textarea}
                        placeholder="Mesaj yaz..."
                        value={draft}
                        onChange={event => setDraft(event.target.value)}
                        onKeyDown={onKeyDown}
                        rows={1}
                    />
                    <button className={styles.sendButton} type="submit" disabled={!draft.trim() || sending}>
                        Gönder
                    </button>
                </div>
            </form>
        </main>
    )
}
