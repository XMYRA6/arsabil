'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ConversationSummary } from '@/lib/akif/chat/conversationStore'

const BASE = '/api/akif/conversations'

export function useConversations(enabled: boolean) {
  const [items, setItems] = useState<ConversationSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [cursor, setCursor] = useState<string | null>(null)
  const seq = useRef(0)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 250)
    return () => clearTimeout(t)
  }, [q])

  const load = useCallback(async (query: string, after: string | null) => {
    const id = ++seq.current
    setLoading(true)
    try {
      const url = `${BASE}?q=${encodeURIComponent(query)}${after ? `&cursor=${encodeURIComponent(after)}` : ''}`
      const res = await fetch(url)
      if (!res.ok) return
      const data = (await res.json()) as { items?: ConversationSummary[]; nextCursor?: string | null }
      if (id !== seq.current) return
      const next = data.items ?? []
      setItems((prev) => (after ? [...prev, ...next] : next))
      setCursor(data.nextCursor ?? null)
    } catch {
      // ağ hatası: liste olduğu gibi kalır
    } finally {
      if (id === seq.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!enabled) {
      seq.current++
      setItems([])
      setCursor(null)
      setLoading(false)
      return
    }
    void load(debouncedQ, null)
  }, [enabled, debouncedQ, load])

  const loadMore = useCallback(async () => {
    if (enabled && cursor) await load(debouncedQ, cursor)
  }, [enabled, cursor, debouncedQ, load])

  const refresh = useCallback(async () => {
    if (enabled) await load(debouncedQ, null)
  }, [enabled, debouncedQ, load])

  const remove = useCallback(async (id: string) => {
    const res = await fetch(`${BASE}/${id}`, { method: 'DELETE' })
    if (res.ok) setItems((prev) => prev.filter((c) => c.id !== id))
  }, [])

  const rename = useCallback(async (id: string, title: string) => {
    const res = await fetch(`${BASE}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })
    if (res.ok) setItems((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)))
  }, [])

  return { items, loading, q, setQ, hasMore: cursor !== null, loadMore, rename, remove, refresh }
}
