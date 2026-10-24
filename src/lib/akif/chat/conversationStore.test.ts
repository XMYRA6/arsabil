import {
  ConversationOwnershipError,
  titleFromMessage,
  normalizeTitle,
  saveTurnPair,
  saveVoiceTranscript,
  assertConversationFree,
  listConversations,
  getConversation,
  renameConversation,
  deleteConversation,
  type ChatDb,
} from './conversationStore'
import type { AkifTurn, ToolResultCard } from '@/lib/ai/akif/contract'

type Conv = { id: string; userId: string; title: string; searchText: string; projectId: string | null; createdAt: Date; lastMessageAt: Date }
type Msg = { id: string; conversationId: string; role: string; content: string; searchText: string; turn: unknown; card: unknown; channel: string; clientId: string | null; createdAt: Date }

function makeFake() {
  const convs: Conv[] = []
  const msgs: Msg[] = []
  let n = 0
  let clock = 1000
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const matchConv = (c: Conv, where: any): boolean => {
    if (!where) return true
    if (where.id !== undefined && c.id !== where.id) return false
    if (where.userId !== undefined && c.userId !== where.userId) return false
    if (where.OR) {
      return where.OR.some((w: any) => {
        if (w.searchText) return c.searchText.includes(w.searchText.contains)
        if (w.messages) return msgs.some((m) => m.conversationId === c.id && m.searchText.includes(w.messages.some.searchText.contains))
        return false
      })
    }
    return true
  }
  const tx: any = {
    akifConversation: {
      findUnique: async ({ where }: any) => convs.find((c) => c.id === where.id) ?? null,
      findFirst: async ({ where }: any) => convs.find((c) => matchConv(c, where)) ?? null,
      upsert: async ({ where, create }: any) => {
        const ex = convs.find((c) => c.id === where.id)
        if (ex) return ex
        const c = { projectId: null, createdAt: new Date(clock++), ...create } as Conv
        convs.push(c)
        return c
      },
      update: async ({ where, data }: any) => {
        const c = convs.find((x) => x.id === where.id)!
        Object.assign(c, data)
        return c
      },
      findMany: async ({ where, take, cursor, skip }: any) => {
        let r = convs.filter((c) => matchConv(c, where)).sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime())
        if (cursor) r = r.slice(r.findIndex((c) => c.id === cursor.id) + (skip ?? 0))
        return take ? r.slice(0, take) : r
      },
      deleteMany: async ({ where }: any) => {
        const del = convs.filter((c) => matchConv(c, where))
        del.forEach((c) => convs.splice(convs.indexOf(c), 1))
        return { count: del.length }
      },
      updateMany: async ({ where, data }: any) => {
        const t = convs.filter((c) => matchConv(c, where))
        t.forEach((c) => Object.assign(c, data))
        return { count: t.length }
      },
    },
    akifChatMessage: {
      createMany: async ({ data, skipDuplicates }: any) => {
        let count = 0
        for (const d of data) {
          if (d.clientId != null && msgs.some((m) => m.conversationId === d.conversationId && m.clientId === d.clientId)) {
            if (skipDuplicates) continue
            throw new Error('unique')
          }
          msgs.push({ id: `m${++n}`, createdAt: new Date(clock++), turn: null, card: null, channel: 'text', clientId: null, ...d })
          count++
        }
        return { count }
      },
      findMany: async ({ where }: any) => msgs.filter((m) => m.conversationId === where.conversationId).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()),
    },
  }
  const db: ChatDb = { ...tx, $transaction: async (fn: any) => fn(tx) }
  /* eslint-enable @typescript-eslint/no-explicit-any */
  return { db, convs, msgs }
}

const turn = (speech: string): AkifTurn => ({ speech, risk_level: 'low' } as unknown as AkifTurn)

describe('titleFromMessage', () => {
  it('kırpar ve ≤40', () => {
    const t = titleFromMessage("  Akçaabat'ta 1.250 m² imarlı arsa ne eder ve nasıl hesaplanır?  ")
    expect(t.length).toBeLessThanOrEqual(40)
    expect(t).toBe(t.trim())
    expect(t.startsWith('Akçaabat')).toBe(true)
  })
  it('vekil çifti bölmez', () => {
    const t = titleFromMessage('😀'.repeat(60))
    expect(Array.from(t)).toHaveLength(40)
    expect(t).toBe('😀'.repeat(40))
  })
  it('normalizeTitle: 120 sınır, boşta boş', () => {
    expect(normalizeTitle('   ')).toBe('')
    expect(normalizeTitle('a'.repeat(200))).toHaveLength(120)
  })
  it('boşta Yeni sohbet', () => {
    expect(titleFromMessage('   ')).toBe('Yeni sohbet')
  })
})

describe('saveTurnPair', () => {
  it('yeni sohbet: başlık, searchText, 2 mesaj', async () => {
    const { db, convs, msgs } = makeFake()
    await saveTurnPair(db, { userId: 'u1', conversationId: 'c1', userMessage: 'İSPARTA arsa', turn: turn('Şöyle yapılır') })
    expect(convs[0].title).toBe('İSPARTA arsa')
    expect(convs[0].searchText).toBe('isparta arsa')
    expect(msgs.map((m) => m.role)).toEqual(['user', 'akif'])
    expect(msgs[1].content).toBe('Şöyle yapılır')
    expect(msgs[1].turn).toBeTruthy()
    expect(msgs[1].searchText).toBe('soyle yapilir')
  })
  it('mevcut sohbet: başlık değişmez, lastMessageAt güncellenir', async () => {
    const { db, convs, msgs } = makeFake()
    await saveTurnPair(db, { userId: 'u1', conversationId: 'c1', userMessage: 'ilk', turn: turn('a') })
    const before = convs[0].lastMessageAt
    await new Promise((r) => setTimeout(r, 5))
    await saveTurnPair(db, { userId: 'u1', conversationId: 'c1', userMessage: 'ikinci', turn: turn('b') })
    expect(convs[0].title).toBe('ilk')
    expect(convs[0].lastMessageAt.getTime()).toBeGreaterThan(before.getTime())
    expect(msgs).toHaveLength(4)
  })
  it('başkasının sohbeti: hata, mesaj yazılmaz', async () => {
    const { db, msgs } = makeFake()
    await saveTurnPair(db, { userId: 'u1', conversationId: 'c1', userMessage: 'x', turn: turn('a') })
    await expect(saveTurnPair(db, { userId: 'u2', conversationId: 'c1', userMessage: 'y', turn: turn('b') })).rejects.toBeInstanceOf(ConversationOwnershipError)
    await expect(assertConversationFree(db, { userId: 'u2', conversationId: 'c1' })).rejects.toBeInstanceOf(ConversationOwnershipError)
    await expect(assertConversationFree(db, { userId: 'u1', conversationId: 'c1' })).resolves.toBeUndefined()
    await expect(assertConversationFree(db, { userId: 'u2', conversationId: 'yok' })).resolves.toBeUndefined()
    expect(msgs).toHaveLength(2)
  })
})

describe('saveVoiceTranscript', () => {
  it('idempotent', async () => {
    const { db, msgs } = makeFake()
    const card = { kind: 'term' } as unknown as ToolResultCard
    const items = [
      { id: 'a', role: 'user' as const, text: 'merhaba' },
      { id: 'b', role: 'akif' as const, text: 'selam', card },
    ]
    expect(await saveVoiceTranscript(db, { userId: 'u1', conversationId: 'v1', items })).toEqual({ saved: 2 })
    expect(await saveVoiceTranscript(db, { userId: 'u1', conversationId: 'v1', items })).toEqual({ saved: 0 })
    expect(msgs).toHaveLength(2)
    expect(msgs.every((m) => m.channel === 'voice')).toBe(true)
    expect(msgs[1].card).toEqual(card)
    expect(msgs[0].clientId).toBe('a')
  })
})

describe('eşzamanlılık', () => {
  it('aynı yeni id, iki saveTurnPair', async () => {
    const { db, convs, msgs } = makeFake()
    await Promise.all([
      saveTurnPair(db, { userId: 'u1', conversationId: 'n1', userMessage: 'a', turn: turn('x') }),
      saveTurnPair(db, { userId: 'u1', conversationId: 'n1', userMessage: 'b', turn: turn('y') }),
    ])
    expect(convs).toHaveLength(1)
    expect(msgs).toHaveLength(4)
  })
  it('aynı yeni id, iki saveVoiceTranscript', async () => {
    const { db, convs, msgs } = makeFake()
    const items = [{ id: 'a', role: 'user' as const, text: 'merhaba' }]
    const r = await Promise.all([
      saveVoiceTranscript(db, { userId: 'u1', conversationId: 'n2', items }),
      saveVoiceTranscript(db, { userId: 'u1', conversationId: 'n2', items }),
    ])
    expect(r.map((x) => x.saved).sort()).toEqual([0, 1])
    expect(convs).toHaveLength(1)
    expect(msgs).toHaveLength(1)
  })
  it('başkasının satırı: yazma yok, lastMessageAt değişmez', async () => {
    const { db, convs, msgs } = makeFake()
    await saveVoiceTranscript(db, { userId: 'u1', conversationId: 'n3', items: [{ id: 'a', role: 'user', text: 'x' }] })
    const before = convs[0].lastMessageAt.getTime()
    await expect(
      saveVoiceTranscript(db, { userId: 'u2', conversationId: 'n3', items: [{ id: 'b', role: 'user', text: 'y' }] }),
    ).rejects.toBeInstanceOf(ConversationOwnershipError)
    expect(msgs).toHaveLength(1)
    expect(convs[0].lastMessageAt.getTime()).toBe(before)
  })
})

describe('list/get/rename/delete', () => {
  it('arama, sahiplik, take', async () => {
    const { db } = makeFake()
    await saveTurnPair(db, { userId: 'u1', conversationId: 'c1', userMessage: 'merhaba', turn: turn('Isparta imar durumu') })
    await saveTurnPair(db, { userId: 'u1', conversationId: 'c2', userMessage: 'Ankara', turn: turn('x') })
    await saveTurnPair(db, { userId: 'u2', conversationId: 'c3', userMessage: 'Isparta', turn: turn('x') })
    const r = await listConversations(db, { userId: 'u1', q: 'ISPARTA' })
    expect(r.items.map((i) => i.id)).toEqual(['c1'])
    const all = await listConversations(db, { userId: 'u1' })
    expect(all.items.map((i) => i.id).sort()).toEqual(['c1', 'c2'])
    const page = await listConversations(db, { userId: 'u1', take: 1 })
    expect(page.items).toHaveLength(1)
    expect(page.nextCursor).not.toBeNull()
    const p2 = await listConversations(db, { userId: 'u1', take: 1, cursor: page.nextCursor! })
    expect(p2.items).toHaveLength(1)
    expect(p2.items[0].id).not.toBe(page.items[0].id)
    expect(p2.nextCursor).toBeNull()
  })
  it('get/rename/delete sahiplik', async () => {
    const { db, convs } = makeFake()
    await saveTurnPair(db, { userId: 'u1', conversationId: 'c1', userMessage: 'a', turn: turn('b') })
    expect(await getConversation(db, { userId: 'u2', id: 'c1' })).toBeNull()
    const g = await getConversation(db, { userId: 'u1', id: 'c1' })
    expect(g!.messages).toHaveLength(2)
    expect(g!.messages[0].channel).toBe('text')
    expect(await renameConversation(db, { userId: 'u2', id: 'c1', title: 'z' })).toBe(false)
    expect(await deleteConversation(db, { userId: 'u2', id: 'c1' })).toBe(false)
    expect(await renameConversation(db, { userId: 'u1', id: 'c1', title: 'Yeni' })).toBe(true)
    expect(convs[0].title).toBe('Yeni')
    const long = 'b'.repeat(100)
    expect(await renameConversation(db, { userId: 'u1', id: 'c1', title: long })).toBe(true)
    expect(convs[0].title).toHaveLength(100)
    expect(await renameConversation(db, { userId: 'u1', id: 'c1', title: '   ' })).toBe(false)
    expect(convs[0].title).toBe(long)
    expect(await deleteConversation(db, { userId: 'u1', id: 'c1' })).toBe(true)
    expect(convs).toHaveLength(0)
  })
})
