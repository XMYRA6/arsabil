import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { consumeClaim } from '@/lib/akifProje/claim'
import { readWhatsappConfig } from '@/lib/whatsapp/config'
import { createSendText } from '@/lib/whatsapp/sendMessage'
import { checkRateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'

const FAIL: Record<string, { status: number; message: string }> = {
  invalid: { status: 400, message: 'Bağlantı geçersiz.' },
  used: { status: 409, message: 'Bu bağlantı daha önce kullanılmış.' },
  expired: { status: 410, message: "Bağlantının süresi dolmuş. WhatsApp'tan Akif'ten yeni bir bağlantı iste." },
  phone_taken: { status: 409, message: 'Bu telefon numarası başka bir hesaba bağlı.' },
  user_has_other_phone: { status: 409, message: 'Hesabın zaten başka bir telefona bağlı.' },
}

export async function POST(req: Request): Promise<Response> {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ message: 'Giriş gerekli.' }, { status: 401 })

  if (!checkRateLimit('akif-baglan:' + userId, { limit: 10, windowMs: 3_600_000 }).ok) {
    return NextResponse.json({ message: 'Çok fazla deneme. Biraz sonra tekrar dene.' }, { status: 429 })
  }

  let token: unknown
  try {
    token = ((await req.json()) as { token?: unknown })?.token
  } catch {
    token = undefined
  }
  if (typeof token !== 'string' || token.length === 0 || token.length > 200) {
    return NextResponse.json({ message: FAIL.invalid.message }, { status: 400 })
  }

  const res = await consumeClaim(prisma, { token, userId, now: new Date() })
  if (!res.ok) {
    const f = FAIL[res.reason] ?? FAIL.invalid
    return NextResponse.json({ message: f.message }, { status: f.status })
  }

  // En iyi çaba: WhatsApp onayı (24 saatlik pencere kapalıysa sessizce atlanır).
  try {
    const send = createSendText({ fetch, config: readWhatsappConfig() })
    const body = res.saved
      ? `Hesabın WhatsApp numarana bağlandı ✅ "${res.saved.name ?? 'Adsız proje'}" projen kaydedildi. Artık "geçen ayki projem" gibi sorabilirsin.`
      : 'Hesabın WhatsApp numarana bağlandı ✅ Artık projelerini kaydedebilirsin.'
    await send(res.phone, body)
  } catch (e) {
    console.error('[akif-baglan] whatsapp bildirimi', e)
  }

  return NextResponse.json({ ok: true, saved: !!res.saved, savedProjectName: res.saved?.name ?? null })
}
