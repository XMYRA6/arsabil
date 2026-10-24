import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { getChatDb, saveVoiceTranscript, ConversationOwnershipError } from '@/lib/akif/chat/conversationStore'
import type { ToolResultCard } from '@/lib/ai/akif/contract'

export const runtime = 'nodejs'

const MAX_ITEMS = 200
const MAX_TEXT = 4000

type Item = { id: string; role: 'user' | 'akif'; text: string; card?: ToolResultCard }

function parseItems(raw: unknown): Item[] | null {
  if (!Array.isArray(raw) || raw.length > MAX_ITEMS) return null
  const out: Item[] = []
  for (const r of raw) {
    if (!r || typeof r !== 'object') return null
    const { id, role, text, card } = r as Record<string, unknown>
    if (typeof id !== 'string' || !id) return null
    if (role !== 'user' && role !== 'akif') return null
    if (typeof text !== 'string' || !text || text.length > MAX_TEXT) return null
    out.push(card && typeof card === 'object' ? { id, role, text, card: card as ToolResultCard } : { id, role, text })
  }
  return out
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ message: 'Giriş gerekli.' }, { status: 401 })
  const { id: conversationId } = await ctx.params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ message: 'Geçersiz istek.' }, { status: 400 })
  }
  const b = (body ?? {}) as { items?: unknown; projectId?: unknown }
  const items = parseItems(b.items)
  if (!items) return NextResponse.json({ message: 'Geçersiz transkript.' }, { status: 400 })

  try {
    const res = await saveVoiceTranscript(getChatDb(), {
      userId,
      conversationId,
      items,
      ...(typeof b.projectId === 'string' ? { projectId: b.projectId } : {}),
    })
    return NextResponse.json(res)
  } catch (e) {
    if (e instanceof ConversationOwnershipError) {
      return NextResponse.json({ message: 'Bu sohbet başka bir kullanıcıya ait.' }, { status: 409 })
    }
    throw e
  }
}
