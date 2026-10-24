import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { getChatDb, listConversations } from '@/lib/akif/chat/conversationStore'

export const runtime = 'nodejs'

const DEFAULT_TAKE = 30
const MAX_TAKE = 50

export async function GET(req: Request): Promise<Response> {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ message: 'Giriş gerekli.' }, { status: 401 })

  const sp = new URL(req.url).searchParams
  const q = sp.get('q') ?? undefined
  const cursor = sp.get('cursor') ?? undefined
  const rawTake = Number.parseInt(sp.get('take') ?? '', 10)
  const take = Number.isFinite(rawTake) && rawTake > 0 ? Math.min(rawTake, MAX_TAKE) : DEFAULT_TAKE

  const result = await listConversations(getChatDb(), { userId, q, cursor, take })
  return NextResponse.json(result)
}
