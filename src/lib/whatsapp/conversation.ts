import type { ConvFields, ConvState } from './types'

export const TTL_MS = 30 * 60 * 1000

export function mergeFields(prev: ConvFields, incoming: Partial<ConvFields>): ConvFields {
  const out: ConvFields = { ...prev }
  for (const [k, val] of Object.entries(incoming)) {
    if (val !== undefined && val !== '' && val !== 0) {
      ;(out as Record<string, unknown>)[k] = val
    }
  }
  return out
}

export interface ConversationStore {
  loadConversation(phone: string): Promise<{ state: ConvState; lastMessageId: string | null } | null>
  saveConversation(phone: string, state: ConvState, lastMessageId: string): Promise<void>
}

type Db = {
  whatsappConversation: {
    findUnique(a: { where: { phone: string } }): Promise<{ state: unknown; lastMessageId: string | null; updatedAt: Date } | null>
    upsert(a: unknown): Promise<unknown>
  }
}

export function createPrismaConversationStore(db: Db, now: () => number = Date.now): ConversationStore {
  return {
    async loadConversation(phone) {
      const row = await db.whatsappConversation.findUnique({ where: { phone } })
      if (!row) return null
      if (now() - row.updatedAt.getTime() > TTL_MS) return null
      return { state: row.state as ConvState, lastMessageId: row.lastMessageId }
    },
    async saveConversation(phone, state, lastMessageId) {
      await db.whatsappConversation.upsert({
        where: { phone },
        create: { phone, state: state as unknown, lastMessageId },
        update: { state: state as unknown, lastMessageId },
      })
    },
  }
}
