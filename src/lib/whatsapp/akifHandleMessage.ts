// Akif-5 — WhatsApp inbound handler. 5a'nın state-machine'inin YERİNE
// geçer: idempotency + rate-limit + DURDUR/abone-daveti pre-empt'leri
// deterministik kalır, geri kalan her şey Akif-1 orchestrator'ına gider.

import type { InboundMessage } from './types'
import type { AkifMessage, AkifTurn, ToolResultCard } from '@/lib/ai/akif/contract'
import { runAkifTurn } from '@/lib/ai/akif/orchestrator'
import type { createAkifModel } from '@/lib/ai/akif/openaiClient'
import type { createAuditLogger } from '@/lib/ai/akif/audit'
import { renderCard } from './renderCard'
import { renderFollowup } from './renderFollowup'
import { renderError } from './renderError'
import { checkRateLimit as defaultCheckRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import type { WaToolName } from './akifToolGateway'
import type { ValidateResult } from '@/lib/ai/akif/gateway/toolRegistry'

const MAX_HISTORY = 40

export interface WaAkifState {
  history: AkifMessage[]
  awaitingFollowup?: { il: string; ilce: string; mahalle: string }
}

export interface AkifHandleStore {
  loadConversation(phone: string): Promise<{ state: WaAkifState; lastMessageId: string | null } | null>
  saveConversation(phone: string, state: WaAkifState, lastMessageId: string): Promise<void>
}

export interface AkifHandleDeps {
  store: AkifHandleStore
  model: ReturnType<typeof createAkifModel>
  modelName: string
  dispatch: (name: WaToolName, args: unknown) => Promise<ToolResultCard>
  validateArgs: (name: WaToolName, args: unknown) => ValidateResult
  audit: ReturnType<typeof createAuditLogger>
  checkConversationBudget: (m: { content: string }[]) => { ok: boolean }
  checkMonthlyBudget: () => Promise<{ ok: boolean; spent: number }>
  sendText: (to: string, body: string) => Promise<void>
  checkRateLimit?: typeof defaultCheckRateLimit
  hasSubscription: (phone: string, il: string, ilce: string, mahalle: string) => Promise<boolean>
  upsertSubscription: (phone: string, area: { il: string; ilce: string; mahalle: string }) => Promise<void>
  deleteSubscriptions: (phone: string) => Promise<number>
  toolPolicy: string
  now: () => Date
}

export async function runWhatsappAkifTurn(msg: InboundMessage, deps: AkifHandleDeps): Promise<void> {
  const check = deps.checkRateLimit ?? defaultCheckRateLimit

  // 1. Load state
  const loaded = await deps.store.loadConversation(msg.from)
  const state: WaAkifState = loaded?.state ?? { history: [] }

  // 2. Idempotency — Meta retry'ları tekrar işlenmez.
  if (loaded && loaded.lastMessageId === msg.messageId) return

  // 3. Spam-guard rate limit (mevcut eşik, DEĞİŞMEDİ).
  if (!check('wa:' + msg.from, RATE_LIMITS.WHATSAPP_INBOUND).ok) {
    await deps.sendText(msg.from, renderError.rateLimited())
    return
  }

  // 4. Non-text / boş guard.
  if (msg.type !== 'text') {
    await deps.sendText(msg.from, renderError.textOnly())
    return
  }
  const text = msg.text.trim()
  if (!text) {
    await deps.sendText(msg.from, renderError.help())
    return
  }
  const low = text.toLocaleLowerCase('tr')

  // 5. DURDUR opt-out — Akif'ten ÖNCE, LLM'e hiç gitmeden.
  if (['durdur', 'stop', 'aboneliği iptal', 'abonelikten çık'].includes(low)) {
    const n = await deps.deleteSubscriptions(msg.from)
    await deps.sendText(msg.from, n > 0 ? renderFollowup.unsubscribedAll() : renderFollowup.noSubscription())
    await deps.store.saveConversation(msg.from, { history: state.history }, msg.messageId)
    return
  }

  // 6. Abone-daveti cevabı — kart sonrası "takip edeyim mi?" sorusuna yanıt.
  if (state.awaitingFollowup) {
    const yes = ['evet', 'e', 'olur', 'tamam', 'takip et', 'takip'].includes(low)
    const area = state.awaitingFollowup
    if (yes) {
      await deps.upsertSubscription(msg.from, area)
      await deps.sendText(msg.from, renderFollowup.subscribed(area.mahalle))
      await deps.store.saveConversation(msg.from, { history: state.history }, msg.messageId)
      return
    }
    // "evet" değil → flag temizlenir, mesaj normal Akif akışına düşer.
  }

  // 7. LLM-maliyet rate limit — spam guard'dan AYRI, telefon bazlı.
  if (!check('wa-akif:' + msg.from, RATE_LIMITS.AKIF_WHATSAPP_TURN).ok) {
    await deps.sendText(msg.from, 'Çok sık soru sordun, biraz bekle.')
    return
  }

  // 8. Aylık bütçe guard.
  const mb = await deps.checkMonthlyBudget()
  if (!mb.ok) {
    await deps.sendText(msg.from, 'Akif şu an kapalı, birazdan tekrar dener misin?')
    return
  }

  // 9. Tur akışı.
  let turn: AkifTurn
  try {
    turn = await runAkifTurn(
      {
        conversationId: 'wa:' + msg.from,
        history: state.history,
        userMessage: text,
        extraSystemPrompt: deps.toolPolicy,
      },
      {
        model: deps.model,
        modelName: deps.modelName,
        dispatch: deps.dispatch,
        validateArgs: deps.validateArgs,
        audit: deps.audit,
        checkConversationBudget: deps.checkConversationBudget,
        now: deps.now,
      },
    )
  } catch (e) {
    console.error('[wa-akif] turn', e)
    await deps.sendText(msg.from, 'Şu an sana yardımcı olamıyorum, birazdan tekrar dener misin?')
    return
  }

  // 10. Yanıt oluştur — ParcelCard resolved ise renderCard + (gerekirse) abone daveti eklenir.
  let outgoing = turn.speech
  let newAwaitingFollowup: WaAkifState['awaitingFollowup']
  const card = turn.tool_result
  if (card && card.kind === 'parcel' && card.status === 'resolved' && card.dto && card.siteUrl) {
    outgoing += '\n\n' + renderCard(card.dto, card.siteUrl)
    const { il, ilce, mahalle } = card.dto.parcel
    if (!(await deps.hasSubscription(msg.from, il, ilce, mahalle))) {
      outgoing += '\n\n' + renderFollowup.prompt(mahalle)
      newAwaitingFollowup = { il, ilce, mahalle }
    }
  }
  await deps.sendText(msg.from, outgoing)

  // 11. History + state kaydet.
  // NOT: `AkifMessage[]` tipi doğrudan bu dizi literaline atanmalı — `.slice(...)`
  // zincirine bağlanırsa bağlamsal tip aktarılmaz, `role` `string`e genişler.
  const mergedHistory: AkifMessage[] = [
    ...state.history,
    { role: 'user', content: text },
    { role: 'akif', content: turn.speech },
  ]
  const newHistory = mergedHistory.slice(-MAX_HISTORY)
  await deps.store.saveConversation(
    msg.from,
    newAwaitingFollowup ? { history: newHistory, awaitingFollowup: newAwaitingFollowup } : { history: newHistory },
    msg.messageId,
  )
}
