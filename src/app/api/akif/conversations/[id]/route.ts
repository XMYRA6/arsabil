import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import {
  getChatDb,
  getConversation,
  renameConversation,
  deleteConversation,
  normalizeTitle,
} from '@/lib/akif/chat/conversationStore'

export const runtime = 'nodejs'

type Ctx = { params: Promise<{ id: string }> }

const unauth = () => NextResponse.json({ message: 'Giriş gerekli.' }, { status: 401 })
const notFound = () => NextResponse.json({ message: 'Sohbet bulunamadı.' }, { status: 404 })

export async function GET(_req: Request, ctx: Ctx): Promise<Response> {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id
  if (!userId) return unauth()
  const { id } = await ctx.params
  const found = await getConversation(getChatDb(), { userId, id })
  if (!found) return notFound()
  return NextResponse.json(found)
}

export async function PATCH(req: Request, ctx: Ctx): Promise<Response> {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id
  if (!userId) return unauth()
  const { id } = await ctx.params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ message: 'Geçersiz istek.' }, { status: 400 })
  }
  const title = (body as { title?: unknown } | null)?.title
  if (typeof title !== 'string') {
    return NextResponse.json({ message: 'Başlık gerekli.' }, { status: 400 })
  }
  const clean = normalizeTitle(title, 121)
  if (!clean || Array.from(clean).length > 120) {
    return NextResponse.json({ message: 'Başlık 1-120 karakter olmalı.' }, { status: 400 })
  }

  const ok = await renameConversation(getChatDb(), { userId, id, title })
  if (!ok) return notFound()
  return new Response(null, { status: 204 })
}

export async function DELETE(_req: Request, ctx: Ctx): Promise<Response> {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id
  if (!userId) return unauth()
  const { id } = await ctx.params
  const ok = await deleteConversation(getChatDb(), { userId, id })
  if (!ok) return notFound()
  return new Response(null, { status: 204 })
}
