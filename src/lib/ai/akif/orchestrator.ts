// Akif-1 — tur orkestratörü.
// Bir metin turu → (bütçe kontrolü) → OpenAI çağrı 1 (araç çağırma) →
// (doğrula + araç dispatch) → OpenAI çağrı 2 (yapılandırılmış JSON) → parse →
// GERÇEK araç sonucunu enjekte et → audit → `AkifTurn` döndür.
// RETRY YOK. Her dep dışarıdan enjekte edilir (test için tamamen sahte).

import type { AkifMessage, AkifTurn, ToolResultCard } from './contract'
import { parseAkifTurn } from './contract'
import type { ToolName } from './gateway/toolRegistry'
import { validateArgs as realValidateArgs } from './gateway/toolRegistry'
import { assembleSystemPrompt } from './prompts/assemble'
import { createAkifModel, estimateCostUsd, type ChatMsg } from './openaiClient'
import { createAuditLogger } from './audit'

export interface RunAkifTurnInput {
  conversationId: string
  history: AkifMessage[]
  userMessage: string
  projectMemory?: string | null
  extraSystemPrompt?: string
}

export interface RunAkifTurnDeps {
  model: ReturnType<typeof createAkifModel>
  modelName: string
  dispatch: (name: ToolName, args: unknown) => Promise<ToolResultCard>
  validateArgs: typeof realValidateArgs
  audit: ReturnType<typeof createAuditLogger>
  checkConversationBudget: (messages: { content: string }[]) => { ok: boolean }
  now: () => Date
}

function budgetOutOfScopeTurn(): AkifTurn {
  return {
    intent: 'out_of_scope',
    speech: 'Konuşmamız uzadı, yeni bir sohbet açalım.',
    state: 'NEUTRAL',
    facts_used: [],
    assumptions: [],
    missing_fields: [],
    risk_level: 'low',
  }
}

function parseFallbackTurn(): AkifTurn {
  return {
    intent: 'out_of_scope',
    speech: 'Bir sorun oldu, tekrar dener misin?',
    state: 'NEUTRAL',
    facts_used: [],
    assumptions: [],
    missing_fields: [],
    risk_level: 'low',
  }
}

export async function runAkifTurn(
  input: RunAkifTurnInput,
  deps: RunAkifTurnDeps,
): Promise<AkifTurn> {
  const { conversationId, history, userMessage, projectMemory, extraSystemPrompt } = input
  const turnNumber = Math.floor(history.length / 2) + 1

  // Sistem prompt'u bir kez kur — hem bütçe kontrolü hem sohbet mesajları
  // aynı metni kullanır (final review I8: ~3k token'lık sistem prompt'u
  // bütçe hesabına dahil edilmezse tur bütçesi ~2× az sayılıyordu).
  const systemPrompt = assembleSystemPrompt({
    hasHistory: history.length > 0,
    projectMemory,
    extraSystemPrompt,
  })

  // 1. Bütçe kontrolü — aşıldıysa model HİÇ çağrılmaz.
  const budget = deps.checkConversationBudget([
    { content: systemPrompt },
    ...history.map((m) => ({ content: m.content })),
    { content: userMessage },
  ])
  if (!budget.ok) {
    const turn = budgetOutOfScopeTurn()
    await deps.audit.logTurn({
      conversationId,
      turn: turnNumber,
      model: deps.modelName,
      promptTokens: 0,
      completionTokens: 0,
      estCostUsd: 0,
      intent: 'out_of_scope',
      tool: null,
    })
    return turn
  }

  let promptTokens = 0
  let completionTokens = 0
  let toolName: string | null = null

  // 2. Sohbet mesajları.
  const chatMsgs: ChatMsg[] = [
    { role: 'system', content: systemPrompt },
    ...history.map(
      (m): ChatMsg => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      }),
    ),
    { role: 'user', content: userMessage },
  ]

  let toolResult: ToolResultCard | undefined
  let turnRaw: unknown

  // OpenAI çağrıları + aradaki dispatch: hata → audit + fallback tur (throw yok).
  try {
    // 3. OpenAI çağrı 1 — araç çağırma.
    const r1 = await deps.model.chatWithTools(chatMsgs)
    promptTokens += r1.usage.promptTokens
    completionTokens += r1.usage.completionTokens

    // 4. Araç çağrısı → doğrula + dispatch; düz metin → asistan mesajı ekle.
    if (r1.kind === 'tool_call') {
      const v = deps.validateArgs(r1.toolName as ToolName, r1.toolArgs)
      // OpenAI kuralı: role:'tool' mesajı MUTLAKA bir tool_calls'lu asistan
      // mesajını takip etmeli — geçersiz argümanda bile önce onu push et.
      chatMsgs.push({
        role: 'assistant',
        content: '',
        tool_calls: [
          {
            id: r1.toolCallId,
            type: 'function',
            function: {
              name: r1.toolName,
              arguments: JSON.stringify(r1.toolArgs),
            },
          },
        ],
      })
      if (v.ok) {
        // Dispatch'ten ÖNCE ata — dispatch fırlarsa bile audit doğru aracı yazsın.
        toolName = r1.toolName ?? null
        toolResult = await deps.dispatch(r1.toolName as ToolName, r1.toolArgs)
        chatMsgs.push({
          role: 'tool',
          tool_call_id: r1.toolCallId,
          content: JSON.stringify(toolResult),
        })
      } else {
        chatMsgs.push({
          role: 'tool',
          tool_call_id: r1.toolCallId,
          content: JSON.stringify({
            error: 'invalid_args',
            field: v.field,
            reason: v.reason,
          }),
        })
      }
    } else {
      chatMsgs.push({ role: 'assistant', content: r1.text ?? '' })
    }

    // 5. OpenAI çağrı 2 — yapılandırılmış JSON.
    const r2 = await deps.model.finalStructured(chatMsgs)
    promptTokens += r2.usage.promptTokens
    completionTokens += r2.usage.completionTokens
    turnRaw = r2.turnRaw
  } catch (err) {
    // Ham hata nesnesini loglama — yalnız ad + mesaj (PII / gizli anahtar sızıntısı olmasın).
    console.error(
      '[akif] orchestrator model error',
      err instanceof Error ? { name: err.name, message: err.message } : err,
    )
    await deps.audit.logTurn({
      conversationId: input.conversationId,
      turn: turnNumber,
      model: deps.modelName,
      promptTokens,
      completionTokens,
      estCostUsd: estimateCostUsd(
        deps.modelName,
        promptTokens,
        completionTokens,
      ),
      intent: 'out_of_scope',
      tool: toolName,
    })
    return {
      intent: 'out_of_scope',
      speech: 'Şu an sana yardımcı olamıyorum, birazdan tekrar dener misin?',
      state: 'NEUTRAL',
      facts_used: [],
      assumptions: [],
      missing_fields: [],
      risk_level: 'low',
    }
  }

  // 6. Parse — başarısızsa fallback tur.
  const turn = parseAkifTurn(turnRaw) ?? parseFallbackTurn()

  // 7. Sonuç enjeksiyonu — modelin kendi tool_result'ı parseAkifTurn'de atıldı.
  if (toolResult) {
    if (toolResult.kind === 'term' || toolResult.kind === 'parcel' || toolResult.kind === 'project' || toolResult.kind === 'parcel_compare') {
      turn.tool_result = toolResult
    } else {
      turn.assumptions = [
        ...new Set([
          ...turn.assumptions,
          ...toolResult.assumptions,
          ...toolResult.defaultsUsed,
        ]),
      ]
      // Kesirli daire sayılarını gösterim için 1 ondalığa yuvarla (kopya üzerinde).
      turn.tool_result = {
        ...toolResult,
        rows: toolResult.rows.map((r) => ({
          ...r,
          arsaSahibiDaireSayisi:
            typeof r.arsaSahibiDaireSayisi === 'number'
              ? Math.round(r.arsaSahibiDaireSayisi * 10) / 10
              : r.arsaSahibiDaireSayisi,
        })),
      }
    }
  }

  // 8. Audit.
  await deps.audit.logTurn({
    conversationId,
    turn: turnNumber,
    model: deps.modelName,
    promptTokens,
    completionTokens,
    estCostUsd: estimateCostUsd(deps.modelName, promptTokens, completionTokens),
    intent: turn.intent,
    tool: toolName,
  })

  // 9.
  return turn
}
