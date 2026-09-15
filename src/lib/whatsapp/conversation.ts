export const TTL_MS = 30 * 60 * 1000

export interface ConversationStore<T> {
  loadConversation(phone: string): Promise<{ state: T; lastMessageId: string | null } | null>
  saveConversation(phone: string, state: T, lastMessageId: string): Promise<void>
}

type Db = {
  whatsappConversation: {
    findUnique(a: { where: { phone: string } }): Promise<{ state: unknown; lastMessageId: string | null; updatedAt: Date } | null>
    upsert(a: unknown): Promise<unknown>
  }
}

export function createPrismaConversationStore<T>(db: Db, now: () => number = Date.now): ConversationStore<T> {
  return {
    async loadConversation(phone) {
      const row = await db.whatsappConversation.findUnique({ where: { phone } })
      if (!row) return null
      if (now() - row.updatedAt.getTime() > TTL_MS) return null
      return { state: row.state as T, lastMessageId: row.lastMessageId }
    },
    async saveConversation(phone, state, lastMessageId) {
      // Aynı telefondan eşzamanlı mesajlarda last-write-wins — v1 hacminde kabul; 5b'de atomik merge / SELECT FOR UPDATE.
      await db.whatsappConversation.upsert({
        where: { phone },
        create: { phone, state: state as unknown, lastMessageId },
        update: { state: state as unknown, lastMessageId },
      })
    },
  }
}
