import type { InboundMessage, ConvState, ConvFields, ConvLevel, AreaOption } from './types'
import type { ConversationStore } from './conversation'
import { mergeFields } from './conversation'
import type { QueryUnderstanding } from './understanding'
import { resolveLocation, type ResolveLocationDeps } from './resolveLocation'
import { matchAreaName } from './matchAreaName'
import { renderCard } from './renderCard'
import { renderError } from './renderError'
import type { DegerCardResult } from '@/lib/deger/card'
import { checkRateLimit as defaultCheckRateLimit, RATE_LIMITS } from '@/lib/rate-limit'

export interface HandleDeps {
  store: ConversationStore
  understanding: QueryUnderstanding
  resolveDeps: ResolveLocationDeps
  buildCard: (mahalleId: number, ada: string, parsel: string) => Promise<DegerCardResult>
  sendText: (to: string, body: string) => Promise<void>
  siteUrlFor: (f: { il: string; ilce: string; mahalle: string; mahalleId: number; ada: string; parsel: string }) => string
  checkRateLimit?: typeof defaultCheckRateLimit
}

const ORDER: { level: ConvLevel; key: keyof ConvFields }[] = [
  { level: 'il', key: 'ilText' },
  { level: 'ilce', key: 'ilceText' },
  { level: 'mahalle', key: 'mahalleText' },
  { level: 'ada', key: 'ada' },
  { level: 'parsel', key: 'parsel' },
]

export async function handleMessage(msg: InboundMessage, deps: HandleDeps): Promise<void> {
  const check = deps.checkRateLimit ?? defaultCheckRateLimit
  const save = (state: ConvState) => deps.store.saveConversation(msg.from, state, msg.messageId)

  // 1. Rate limit
  if (!check('wa:' + msg.from, RATE_LIMITS.WHATSAPP_INBOUND).ok) {
    await deps.sendText(msg.from, renderError.rateLimited())
    return
  }

  // 2. Load state
  const loaded = await deps.store.loadConversation(msg.from)
  const state: ConvState = loaded?.state ?? { fields: {} }

  // 3. Idempotency
  if (loaded && loaded.lastMessageId === msg.messageId) return

  // 4. Non-text guard
  if (msg.type !== 'text') {
    await deps.sendText(msg.from, renderError.textOnly())
    return
  }

  // 5. Empty guard
  const text = msg.text.trim()
  if (!text) {
    await deps.sendText(msg.from, renderError.help())
    return
  }

  let fields: ConvFields = { ...state.fields }
  let skipToResolve = false
  let skipUnderstand = false

  // 6. Disambiguation answer
  if (state.candidates?.length) {
    const cands = state.candidates
    const level = state.candidateLevel!
    let matched: AreaOption | undefined
    if (/^\d+$/.test(text)) {
      matched = cands[Number(text) - 1]
    } else {
      const m = matchAreaName(text, cands)
      if (m.length === 1) matched = m[0]
    }
    if (matched) {
      if (level === 'il') {
        fields.ilId = matched.id
        fields.ilText = matched.text
      } else if (level === 'ilce') {
        fields.ilceId = matched.id
        fields.ilceText = matched.text
      } else {
        fields.mahalleId = matched.id
        fields.mahalleText = matched.text
      }
      skipToResolve = true
    } else {
      await deps.sendText(msg.from, renderError.chooseFrom(level, cands))
      await save(state)
      return
    }
  }

  // 7. Pending single field
  if (!skipToResolve && state.pending && !state.candidates?.length) {
    const pending = state.pending
    if (pending === 'ada' || pending === 'parsel') {
      if (/^\d{1,7}$/.test(text)) {
        fields[pending] = text
      } else {
        await deps.sendText(msg.from, renderError.askFor(pending, fields))
        return
      }
    } else {
      const textKey = `${pending}Text` as 'ilText' | 'ilceText' | 'mahalleText'
      fields[textKey] = text
      if (pending === 'il') {
        fields.ilId = undefined
        fields.ilceId = undefined
        fields.ilceText = undefined
        fields.mahalleId = undefined
        fields.mahalleText = undefined
      } else if (pending === 'ilce') {
        fields.ilceId = undefined
        fields.mahalleId = undefined
        fields.mahalleText = undefined
      } else {
        fields.mahalleId = undefined
      }
    }
    skipUnderstand = true
  }

  // 8. Normal understanding
  if (!skipToResolve && !skipUnderstand) {
    const parsed = await deps.understanding.understand(text, state.fields)
    fields = mergeFields(state.fields, parsed)
    if (parsed.ilText != null && parsed.ilText !== state.fields.ilText) {
      fields.ilId = undefined
      fields.ilceId = undefined
      fields.mahalleId = undefined
    }
    if (parsed.ilceText != null && parsed.ilceText !== state.fields.ilceText) {
      fields.ilceId = undefined
      fields.mahalleId = undefined
    }
  }

  // 9. Missing field prompt
  if (!skipToResolve) {
    for (const { level, key } of ORDER) {
      const v = fields[key]
      if (v === undefined || v === '') {
        await deps.sendText(msg.from, renderError.askFor(level, fields))
        await save({ pending: level, fields })
        return
      }
    }
  }

  // 10. Resolve location
  const r = await resolveLocation(fields, deps.resolveDeps)
  if (r.kind === 'ambiguous') {
    await save({ candidates: r.candidates, candidateLevel: r.level, fields })
    await deps.sendText(msg.from, renderError.chooseFrom(r.level, r.candidates))
    return
  }
  if (r.kind === 'notfound') {
    if (r.level === 'il') {
      fields.ilText = undefined
      fields.ilId = undefined
      fields.ilceText = undefined
      fields.ilceId = undefined
      fields.mahalleText = undefined
      fields.mahalleId = undefined
    } else if (r.level === 'ilce') {
      fields.ilceText = undefined
      fields.ilceId = undefined
      fields.mahalleText = undefined
      fields.mahalleId = undefined
    } else {
      fields.mahalleText = undefined
      fields.mahalleId = undefined
    }
    await save({ pending: r.level, fields })
    await deps.sendText(msg.from, renderError.notFound(r.level, r.term, fields))
    return
  }
  // resolved
  fields.mahalleId = r.mahalleId
  fields.ilText = r.il
  fields.ilceText = r.ilce
  fields.mahalleText = r.mahalle

  // 11. Build card
  const res = await deps.buildCard(fields.mahalleId!, fields.ada!, fields.parsel!)
  if (!res.ok) {
    await deps.sendText(msg.from, renderError.forCardFailure(res.reason))
    if (res.reason === 'parcel_not_found') {
      fields.ada = undefined
      fields.parsel = undefined
      await save({ pending: 'ada', fields })
    } else {
      await save({ fields })
    }
    return
  }
  await deps.sendText(
    msg.from,
    renderCard(
      res.card,
      deps.siteUrlFor({
        il: fields.ilText!,
        ilce: fields.ilceText!,
        mahalle: fields.mahalleText!,
        mahalleId: fields.mahalleId!,
        ada: fields.ada!,
        parsel: fields.parsel!,
      }),
    ),
  )

  // 12. Save final state
  await save({ fields })
}
