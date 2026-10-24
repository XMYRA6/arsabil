import { prisma } from '@/lib/prisma'
import type { AkifTurn, ToolResultCard } from '@/lib/ai/akif/contract'
import { foldTr } from './fold'

/* ---------- DI tipi: prisma delegelerinin dar yapısal alt kümesi ---------- */

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface ChatTx {
  akifConversation: {
    findUnique(args: any): Promise<any>
    findFirst(args: any): Promise<any>
    upsert(args: any): Promise<any>
    update(args: any): Promise<any>
    findMany(args: any): Promise<any[]>
    deleteMany(args: any): Promise<{ count: number }>
    updateMany(args: any): Promise<{ count: number }>
  }
  akifChatMessage: {
    createMany(args: any): Promise<{ count: number }>
    findMany(args: any): Promise<any[]>
  }
}
export interface ChatDb extends ChatTx {
  $transaction<T>(fn: (tx: ChatTx) => Promise<T>): Promise<T>
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export function getChatDb(): ChatDb {
  return prisma as unknown as ChatDb
}

/* ---------- tipler ---------- */

export class ConversationOwnershipError extends Error {
  constructor() {
    super('Conversation belongs to another user')
    this.name = 'ConversationOwnershipError'
  }
}

export interface ConversationSummary {
  id: string
  title: string
  projectId: string | null
  lastMessageAt: string
}

export interface StoredMessage {
  id: string
  role: string
  content: string
  turn: AkifTurn | null
  card: ToolResultCard | null
  channel: 'text' | 'voice'
  createdAt: string
}

const TITLE_MAX = 40

export function titleFromMessage(text: string): string {
  const t = text.trim().replace(/\s+/g, ' ')
  if (!t) return 'Yeni sohbet'
  const chars = Array.from(t)
  return chars.length <= TITLE_MAX ? t : chars.slice(0, TITLE_MAX).join('').trim()
}

/** Elle verilen başlık (yeniden adlandırma): kırp + boşlukları sadeleştir; boşsa ''. */
export function normalizeTitle(text: string, max = 120): string {
  const chars = Array.from(text.trim().replace(/\s+/g, ' '))
  return chars.slice(0, max).join('').trim()
}

/* ---------- yardımcılar ---------- */

type MsgInput = {
  role: 'user' | 'akif'
  content: string
  turn?: AkifTurn
  card?: ToolResultCard
  channel: 'text' | 'voice'
  clientId?: string
}

async function ensureConversation(
  tx: ChatTx,
  a: { userId: string; conversationId: string; firstText: string; projectId?: string },
  now: Date,
): Promise<void> {
  const title = titleFromMessage(a.firstText)
  // upsert (update boş): eşzamanlı iki istek aynı yeni id için P2002 almaz,
  // başkasının satırına da yazılmaz.
  const row = await tx.akifConversation.upsert({
    where: { id: a.conversationId },
    create: {
      id: a.conversationId,
      userId: a.userId,
      title,
      searchText: foldTr(title),
      projectId: a.projectId ?? null,
      lastMessageAt: now,
    },
    update: {},
  })
  if (row.userId !== a.userId) throw new ConversationOwnershipError()
}

async function touch(tx: ChatTx, id: string, now: Date): Promise<void> {
  await tx.akifConversation.update({ where: { id }, data: { lastMessageAt: now } })
}

function toRows(conversationId: string, msgs: MsgInput[], base: Date) {
  return msgs.map((m, i) => ({
    conversationId,
    role: m.role,
    content: m.content,
    searchText: foldTr(m.content),
    turn: m.turn ?? undefined,
    card: m.card ?? undefined,
    channel: m.channel,
    clientId: m.clientId ?? null,
    createdAt: new Date(base.getTime() + i),
  }))
}

/* ---------- yazma ---------- */

export async function saveTurnPair(
  db: ChatDb,
  a: { userId: string; conversationId: string; userMessage: string; turn: AkifTurn; projectId?: string },
): Promise<void> {
  const now = new Date()
  await db.$transaction(async (tx) => {
    await ensureConversation(
      tx,
      { userId: a.userId, conversationId: a.conversationId, firstText: a.userMessage, projectId: a.projectId },
      new Date(now.getTime() + 1),
    )
    await tx.akifChatMessage.createMany({
      data: toRows(
        a.conversationId,
        [
          { role: 'user', content: a.userMessage, channel: 'text' },
          { role: 'akif', content: a.turn.speech, turn: a.turn, channel: 'text' },
        ],
        now,
      ),
    })
    await touch(tx, a.conversationId, new Date(now.getTime() + 2))
  })
}

export async function saveVoiceTranscript(
  db: ChatDb,
  a: {
    userId: string
    conversationId: string
    projectId?: string
    items: { id: string; role: 'user' | 'akif'; text: string; card?: ToolResultCard }[]
  },
): Promise<{ saved: number }> {
  if (a.items.length === 0) return { saved: 0 }
  const now = new Date()
  const firstUser = a.items.find((i) => i.role === 'user') ?? a.items[0]
  return db.$transaction(async (tx) => {
    await ensureConversation(
      tx,
      { userId: a.userId, conversationId: a.conversationId, firstText: firstUser.text, projectId: a.projectId },
      new Date(now.getTime() + a.items.length),
    )
    const res = await tx.akifChatMessage.createMany({
      data: toRows(
        a.conversationId,
        a.items.map((i) => ({ role: i.role, content: i.text, card: i.card, channel: 'voice' as const, clientId: i.id })),
        now,
      ),
      skipDuplicates: true,
    })
    if (res.count > 0) await touch(tx, a.conversationId, new Date(now.getTime() + a.items.length))
    return { saved: res.count }
  })
}

export async function assertConversationFree(
  db: ChatDb,
  a: { userId: string; conversationId: string },
): Promise<void> {
  const c = await db.akifConversation.findUnique({ where: { id: a.conversationId } })
  if (c && c.userId !== a.userId) throw new ConversationOwnershipError()
}

/* ---------- okuma ---------- */

function summary(c: { id: string; title: string; projectId: string | null; lastMessageAt: Date }): ConversationSummary {
  return { id: c.id, title: c.title, projectId: c.projectId ?? null, lastMessageAt: c.lastMessageAt.toISOString() }
}

export async function listConversations(
  db: ChatDb,
  a: { userId: string; q?: string; take?: number; cursor?: string },
): Promise<{ items: ConversationSummary[]; nextCursor: string | null }> {
  const take = a.take ?? 30
  const folded = a.q ? foldTr(a.q) : ''
  const where: Record<string, unknown> = { userId: a.userId }
  if (folded) {
    where.OR = [
      { searchText: { contains: folded } },
      { messages: { some: { searchText: { contains: folded } } } },
    ]
  }
  const rows = await db.akifConversation.findMany({
    where,
    orderBy: [{ lastMessageAt: 'desc' }, { id: 'desc' }],
    take: take + 1,
    ...(a.cursor ? { cursor: { id: a.cursor }, skip: 1 } : {}),
  })
  const page = rows.slice(0, take)
  return {
    items: page.map(summary),
    nextCursor: rows.length > take ? page[page.length - 1].id : null,
  }
}

export async function getConversation(
  db: ChatDb,
  a: { userId: string; id: string },
): Promise<{ conversation: ConversationSummary; messages: StoredMessage[] } | null> {
  const c = await db.akifConversation.findFirst({ where: { id: a.id, userId: a.userId } })
  if (!c) return null
  const msgs = await db.akifChatMessage.findMany({
    where: { conversationId: a.id },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  })
  return {
    conversation: summary(c),
    messages: msgs.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      turn: (m.turn as AkifTurn | null) ?? null,
      card: (m.card as ToolResultCard | null) ?? null,
      channel: m.channel === 'voice' ? 'voice' : 'text',
      createdAt: m.createdAt.toISOString(),
    })),
  }
}

export async function renameConversation(
  db: ChatDb,
  a: { userId: string; id: string; title: string },
): Promise<boolean> {
  const title = normalizeTitle(a.title)
  if (!title) return false
  const r = await db.akifConversation.updateMany({
    where: { id: a.id, userId: a.userId },
    data: { title, searchText: foldTr(title) },
  })
  return r.count > 0
}

export async function deleteConversation(
  db: ChatDb,
  a: { userId: string; id: string },
): Promise<boolean> {
  const r = await db.akifConversation.deleteMany({ where: { id: a.id, userId: a.userId } })
  return r.count > 0
}
