'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import styles from './page.module.css'

type Phase = 'idle' | 'loading' | 'done' | 'error'

function BaglanInner() {
  const token = useSearchParams().get('t')
  const { status } = useSession()
  const [phase, setPhase] = useState<Phase>('idle')
  const [message, setMessage] = useState('')

  if (!token) {
    return <p className={styles.error}>Bağlantı geçersiz. WhatsApp&apos;tan Akif&apos;ten yeni bir bağlantı iste.</p>
  }

  if (status === 'loading') return <p>Yükleniyor…</p>

  if (status !== 'authenticated') {
    const next = encodeURIComponent(`/akif/baglan?t=${token}`)
    return (
      <>
        <p>Projelerini kaydetmek için ArsaBil hesabın gerekiyor.</p>
        <Link className={styles.button} href={`/login?next=${next}`}>
          Giriş yap veya üye ol
        </Link>
      </>
    )
  }

  const connect = async () => {
    setPhase('loading')
    try {
      const res = await fetch('/api/akif/baglan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        setMessage(
          data.saved
            ? `Hesabın bağlandı. "${data.savedProjectName ?? 'Adsız proje'}" projen kaydedildi.`
            : 'Hesabın WhatsApp numarana bağlandı.',
        )
        setPhase('done')
      } else {
        setMessage(data.message ?? 'Bağlanamadı.')
        setPhase('error')
      }
    } catch {
      setMessage('Bağlantı hatası. Tekrar dene.')
      setPhase('error')
    }
  }

  if (phase === 'done') {
    return (
      <>
        <p className={styles.success}>{message}</p>
        <Link className={styles.button} href="/dashboard/akif-projeler">
          Akif projelerimi gör
        </Link>
      </>
    )
  }

  return (
    <>
      <p>WhatsApp numaranı bu hesaba bağlıyorsun. Bundan sonra projelerin hem WhatsApp&apos;ta hem sitede görünür.</p>
      <button className={styles.button} onClick={connect} disabled={phase === 'loading'}>
        {phase === 'loading' ? 'Bağlanıyor…' : "WhatsApp'a bağla"}
      </button>
      {phase === 'error' && <p className={styles.error}>{message}</p>}
    </>
  )
}

export default function BaglanPage() {
  return (
    <main className={styles.main}>
      <h1 className={styles.title}>WhatsApp bağlantısı</h1>
      <Suspense fallback={<p>Yükleniyor…</p>}>
        <BaglanInner />
      </Suspense>
    </main>
  )
}
