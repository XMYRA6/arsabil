// Akif-1 — /api/akif/turn: tek LLM danışma turu.
// Akış: rate-limit → gövde doğrulama → (opsiyonel) Arsa Dosyası sahiplik
// doğrulama (Akif-3) → env guard → aylık bütçe guard → OpenAI client +
// orchestrator bağımlılıkları → runAkifTurn → (opsiyonel) Arsa Dosyası
// güncelle → AkifTurn JSON.
//
// `readAkifEnv` / `new OpenAI(...)` YALNIZCA handler İÇİNDE çağrılır —
// modül kapsamında değil — böylece `npm run build` OPENAI_API_KEY istemez.
import OpenAI from 'openai'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { runAkifTurn } from '@/lib/ai/akif/orchestrator'
import { COMPARISON_RULES_PROMPT } from '@/lib/ai/akif/prompts/comparisonRules'
import { createAkifModel, readAkifEnv } from '@/lib/ai/akif/openaiClient'
import { createAuditLogger, type AuditDb } from '@/lib/ai/akif/audit'
import { checkConversationBudget, checkMonthlyBudget } from '@/lib/ai/akif/costGuard'
import { AKIF_TOOL_DEFS, type DispatchDeps } from '@/lib/ai/akif/gateway/toolRegistry'
import {
  RICH_EXTRA_TOOL_DEFS,
  validateRichArgs,
  dispatchRichTool,
  type RichToolName,
} from '@/lib/ai/akif/gateway/richTools'
import { createParcelLookupDeps } from '@/lib/ai/akif/gateway/parcelLookupDeps'
import type { AkifMessage, ParcelCompareCard, ParcelCompareRow } from '@/lib/ai/akif/contract'
import { checkRateLimit, getClientIp, RATE_LIMITS } from '@/lib/rate-limit'
import { prisma } from '@/lib/prisma'
import {
  ConversationOwnershipError,
  assertConversationFree,
  getChatDb,
  saveTurnPair,
} from '@/lib/akif/chat/conversationStore'

export const runtime = 'nodejs'

const MAX_HISTORY = 40
const MAX_MEMORY_CHARS = 2000

function isValidHistory(v: unknown): v is AkifMessage[] {
  if (!Array.isArray(v) || v.length > MAX_HISTORY) return false
  return v.every((m) => {
    if (m == null || typeof m !== 'object') return false
    const msg = m as { role?: unknown; content?: unknown }
    return (msg.role === 'user' || msg.role === 'akif') && typeof msg.content === 'string'
  })
}

const COMPARE_RATE_NOTE = 'Çok sık karşılaştırma istendi; bir dakika sonra tekrar dene.'

// compareParcels sınırı aşıldığında fırlatmak yerine temiz render olan bir kart döner.
function compareRateLimitedCard(args: unknown, memberView: boolean): ParcelCompareCard {
  const parcels = (args as { parcels?: unknown } | null)?.parcels
  const rows: ParcelCompareRow[] = Array.isArray(parcels)
    ? parcels
        .filter((p): p is Record<string, unknown> => p != null && typeof p === 'object')
        .map((p) => ({
          label: [p.mahalleText, `${p.ada ?? ''}/${p.parsel ?? ''}`].filter((x) => typeof x === 'string' && x !== '/').join(' '),
          status: 'parcel_unavailable' as const,
        }))
    : []
  return { kind: 'parcel_compare', tier: memberView ? 'member' : 'free', rows, note: COMPARE_RATE_NOTE }
}

export async function POST(req: Request) {
  // 1. Rate limit — IP başına.
  const rl = checkRateLimit('akif:ip:' + getClientIp(req), RATE_LIMITS.AKIF_TURN)
  if (!rl.ok) {
    return Response.json(
      { error: 'rate_limited' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec ?? 60) } },
    )
  }

  // 2. Gövde parse + doğrulama.
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'bad_request' }, { status: 400 })
  }
  if (body == null || typeof body !== 'object') {
    return Response.json({ error: 'bad_request' }, { status: 400 })
  }
  const { conversationId, history, userMessage, projectId } = body as {
    conversationId?: unknown
    history?: unknown
    userMessage?: unknown
    projectId?: unknown
  }
  if (
    typeof conversationId !== 'string' ||
    conversationId.length === 0 ||
    conversationId.startsWith('wa:') ||
    !isValidHistory(history) ||
    typeof userMessage !== 'string' ||
    userMessage.length < 1 ||
    userMessage.length > 2000
  ) {
    return Response.json({ error: 'bad_request' }, { status: 400 })
  }

  // 3. Arsa Dosyası (Akif-3) — projectId gönderildiyse sahiplik doğrula.
  // Sahipsiz/geçersiz projectId İSTEĞİ REDDETMEZ, sessizce yok sayılır —
  // mevcut anonim/projesiz akışla tutarlı davranış. userId'yi burada bir kez
  // sabitliyoruz — adım 8'de updateMany'nin where'i için tekrar oturum
  // sorgulamaya gerek kalmasın diye. getServerSession/findFirst beklenmedik
  // şekilde throw ederse (geçici DB/auth hatası) tur asla çökmemeli — bu
  // durumda da "projectId yok sayıldı" davranışına düşüyoruz.
  let validatedProjectId: string | undefined
  let validatedUserId: string | undefined
  let projectMemory: string | null | undefined
  // Oturum kullanıcısı tek seferde alınır (proje doğrulama + sohbet kalıcılığı
  // için). Auth/DB hatası "oturum yok" olarak ele alınır, tur çökmez.
  let sessionUserId: string | undefined
  try {
    const session = await getServerSession(authOptions)
    if (session?.user?.id) sessionUserId = session.user.id
  } catch (e) {
    console.error('[akif] session lookup', e)
  }
  if (sessionUserId && typeof projectId === 'string' && projectId.length > 0) {
    try {
      const project = await prisma.project.findFirst({
        where: { id: projectId, userId: sessionUserId },
        select: { akifMemory: true },
      })
      if (project) {
        validatedProjectId = projectId
        validatedUserId = sessionUserId
        projectMemory = project.akifMemory ?? null
      }
    } catch (e) {
      console.error('[akif] project ownership check', e)
    }
  }

  // 3b. Sohbet sahipliği — oturum varken conversationId başkasınınsa LLM/bütçe
  // adımlarından ÖNCE 409. Beklenmedik DB hatası turu engellemez.
  if (sessionUserId) {
    try {
      await assertConversationFree(getChatDb(), { userId: sessionUserId, conversationId })
    } catch (e) {
      if (e instanceof ConversationOwnershipError) {
        return Response.json({ error: 'conversation_conflict' }, { status: 409 })
      }
      console.error('[akif] conversation ownership check', e)
    }
  }

  // 4. Ortam — OPENAI_API_KEY yoksa Akif kapalı.
  let env
  try {
    env = readAkifEnv()
  } catch {
    return Response.json({ error: 'akif_unavailable' }, { status: 503 })
  }

  // 5. Aylık bütçe guard.
  // Prisma client, audit/gateway'in dar DI arayüzlerine yapısal olarak uyar;
  // Prisma'nın aggregate imzasındaki opsiyonel `_sum` alanları yüzünden tsc
  // eşleşmiyor — tek noktada daraltıyoruz.
  const db = prisma as unknown as AuditDb & DispatchDeps['db']
  const audit = createAuditLogger(db, { excludeConversationIdPrefix: 'wa:' })
  const mb = await checkMonthlyBudget({
    monthSpendUsd: audit.monthSpendUsd,
    budgetUsd: env.monthlyBudgetUsd,
    now: () => new Date(),
  })
  if (!mb.ok) {
    return Response.json({ error: 'akif_unavailable', reason: 'monthly_budget' }, { status: 503 })
  }

  // 6. OpenAI client + model sarmalayıcı.
  const openai = new OpenAI({ apiKey: env.apiKey })
  const model = createAkifModel({
    client: openai,
    model: env.model,
    toolDefs: [...AKIF_TOOL_DEFS, ...RICH_EXTRA_TOOL_DEFS],
  })
  // Anonim kullanıcı ücretsiz kart görür; oturumlu üye görünümü.
  const memberView = !!sessionUserId

  // 7. Tur akışı.
  try {
    const turn = await runAkifTurn(
      { conversationId, history, userMessage, projectMemory, extraSystemPrompt: COMPARISON_RULES_PROMPT },
      {
        model,
        modelName: env.model,
        dispatch: async (n: RichToolName, a: unknown) => {
          // compareParcels harici veri çeker — ek limit (üye: kullanıcı, anonim: IP, daha sıkı).
          if (n === 'compareParcels') {
            const crl = sessionUserId
              ? checkRateLimit('akif-compare-parcels:user:' + sessionUserId, RATE_LIMITS.AKIF_COMPARE_PARCELS)
              : checkRateLimit('akif-compare-parcels:ip:' + getClientIp(req), RATE_LIMITS.AKIF_COMPARE_PARCELS_ANON)
            if (!crl.ok) return compareRateLimitedCard(a, memberView)
          }
          return dispatchRichTool(n, a, {
            db,
            parcelDeps: createParcelLookupDeps({ memberView }),
            memberView,
          })
        },
        validateArgs: validateRichArgs,
        audit,
        checkConversationBudget: (m: { content: string }[]) =>
          checkConversationBudget(m, env.maxTurnTokens),
        now: () => new Date(),
      },
    )

    // 8. Arsa Dosyası güncelle (Akif-3) — model yeni bir özet önerdiyse.
    // Ayrı try/catch: tur zaten başarıyla üretildi ve bütçeye yazıldı — bu
    // yan etki (hafıza kalıcılığı) başarısız olsa bile kullanıcı cevabını
    // kaybetmemeli, sadece 502'ye düşmeden sessizce loglanır.
    if (validatedProjectId && validatedUserId && turn.memory_updates != null) {
      try {
        const trimmed = turn.memory_updates.trim()
        await prisma.project.updateMany({
          where: { id: validatedProjectId, userId: validatedUserId },
          data: { akifMemory: trimmed.length > 0 ? trimmed.slice(0, MAX_MEMORY_CHARS) : null },
        })
      } catch (e) {
        console.error('[akif] memory write-back', e)
      }
    }

    // 9. Sohbet kalıcılığı — yalnız oturumlu kullanıcı; başarısızlık yanıtı bozmaz.
    if (sessionUserId) {
      try {
        await saveTurnPair(getChatDb(), {
          userId: sessionUserId,
          conversationId,
          userMessage,
          turn,
          projectId: validatedProjectId,
        })
      } catch (e) {
        console.error('[akif] conversation persist', e)
      }
    }

    return Response.json(turn)
  } catch (e) {
    console.error('[akif] turn', e)
    return Response.json({ error: 'akif_error' }, { status: 502 })
  }
}
