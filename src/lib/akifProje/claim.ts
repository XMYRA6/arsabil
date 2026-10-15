// Akif-5c — telefon ↔ hesap eşleştirme bağlantısı (PhoneClaim).
// Token DB'de yalnız SHA-256 hash olarak durur; 15 dk, tek kullanım.

import { createHash, randomBytes } from 'crypto'
import type { Prisma, PrismaClient } from '@prisma/client'
import type { CreateProjectInput } from './types'
import { validateCreateArgs } from './validation'
import { createProjectTx } from './projeKarti'

export const CLAIM_TTL_MS = 15 * 60_000

export interface ClaimDraft {
  op: 'createProject'
  args: CreateProjectInput
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export async function createClaim(
  db: PrismaClient,
  a: { phone: string; draft?: ClaimDraft | null; now: Date; baseUrl: string; token?: string },
): Promise<{ url: string; expiresAt: Date }> {
  const token = a.token ?? randomBytes(32).toString('base64url')
  const expiresAt = new Date(a.now.getTime() + CLAIM_TTL_MS)
  await db.phoneClaim.create({
    data: {
      phone: a.phone,
      tokenHash: hashToken(token),
      draft: a.draft ? (a.draft as unknown as Prisma.InputJsonValue) : undefined,
      expiresAt,
    },
  })
  return { url: `${a.baseUrl.replace(/\/+$/, '')}/akif/baglan?t=${token}`, expiresAt }
}

export type ConsumeResult =
  | { ok: true; phone: string; saved?: { projectId: string; name: string | null } }
  | { ok: false; reason: 'invalid' | 'used' | 'expired' | 'phone_taken' | 'user_has_other_phone' }

function parseDraft(raw: unknown): CreateProjectInput | null {
  if (!raw || typeof raw !== 'object') return null
  const d = raw as { op?: unknown; args?: unknown }
  if (d.op !== 'createProject') return null
  const v = validateCreateArgs(d.args)
  return v.ok ? v.value : null
}

const isUniqueViolation = (e: unknown): boolean => (e as { code?: string } | null)?.code === 'P2002'

export async function consumeClaim(
  db: PrismaClient,
  a: { token: string; userId: string; now: Date },
): Promise<ConsumeResult> {
  const tokenHash = hashToken(a.token)
  try {
    return await db.$transaction(async (tx): Promise<ConsumeResult> => {
      const claim = await tx.phoneClaim.findUnique({ where: { tokenHash } })
      if (!claim) return { ok: false, reason: 'invalid' }
      if (claim.usedAt) return { ok: false, reason: 'used' }
      if (claim.expiresAt.getTime() <= a.now.getTime()) return { ok: false, reason: 'expired' }

      const user = await tx.user.findUnique({ where: { id: a.userId }, select: { whatsappPhone: true } })
      if (!user) return { ok: false, reason: 'invalid' }
      if (user.whatsappPhone && user.whatsappPhone !== claim.phone) {
        return { ok: false, reason: 'user_has_other_phone' }
      }
      const holder = await tx.user.findUnique({ where: { whatsappPhone: claim.phone }, select: { id: true } })
      if (holder && holder.id !== a.userId) return { ok: false, reason: 'phone_taken' }

      const used = await tx.phoneClaim.updateMany({
        where: { id: claim.id, usedAt: null },
        data: { usedAt: a.now, userId: a.userId },
      })
      if (used.count === 0) return { ok: false, reason: 'used' }

      await tx.user.update({ where: { id: a.userId }, data: { whatsappPhone: claim.phone } })

      const draft = parseDraft(claim.draft)
      let saved: { projectId: string; name: string | null } | undefined
      if (draft) {
        const card = await createProjectTx(tx, { ...draft, userId: a.userId, channel: 'whatsapp' }, a.now)
        saved = { projectId: card.id, name: card.name }
      }
      return { ok: true, phone: claim.phone, saved }
    })
  } catch (e) {
    if (isUniqueViolation(e)) return { ok: false, reason: 'phone_taken' }
    throw e
  }
}
