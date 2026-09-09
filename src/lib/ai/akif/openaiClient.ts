// Akif-1 — OpenAI Chat Completions sarmalayıcı.
// Orchestrator her turda İKİ çağrı yapar:
//   1. chatWithTools(messages)   → tools + tool_choice:'auto'  → araç çağrısı VEYA düz metin
//   2. finalStructured(messages) → response_format json_schema (strict) → yapılandırılmış AkifTurn
// RETRY YOK: hata yukarı fırlar, orchestrator yakalar. Maliyet tahmini sabit fiyat tablosu.

import type OpenAI from 'openai'
import { AKIF_TURN_JSON_SCHEMA } from './contract'
import { AKIF_TOOL_DEFS } from './gateway/toolRegistry'

export interface AkifModelDeps {
  client: Pick<OpenAI, 'chat'>
  model: string
}

export interface ChatMsg {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  tool_call_id?: string
  tool_calls?: unknown[]
}

export interface TokenUsage {
  promptTokens: number
  completionTokens: number
}

export interface ChatWithToolsResult {
  kind: 'tool_call' | 'text'
  toolName?: string
  toolArgs?: unknown
  toolCallId?: string
  text?: string
  usage: TokenUsage
}

export interface AkifEnvConfig {
  apiKey: string
  model: string
  maxTurnTokens: number
  monthlyBudgetUsd: number
}

// --- Ortam ----------------------------------------------------------------

type EnvLike = Record<string, string | undefined>

/**
 * Sayısal env okuma. `??` yalnız null/undefined yakalar; container UI'ları
 * (Coolify vb.) set edilmemiş değişkeni `''` olarak verir ve `Number('') === 0`
 * — bu, `maxTurnTokens=0` ("her tur çok uzun") veya `monthlyBudgetUsd=0`
 * ("her istek 503") ile özelliği SESSİZCE kapatırdı (final review I2). Boş /
 * NaN / pozitif-olmayan → fallback.
 */
export function numEnv(v: string | undefined, fallback: number): number {
  const n = Number(v)
  return v != null && v !== '' && Number.isFinite(n) && n > 0 ? n : fallback
}

export function readAkifEnv(env: EnvLike = process.env): AkifEnvConfig {
  const apiKey = env.OPENAI_API_KEY
  if (!apiKey) throw new Error('akif_unavailable')
  return {
    apiKey,
    model: env.AKIF_MODEL || 'gpt-4o-mini',
    maxTurnTokens: numEnv(env.AKIF_MAX_TURN_TOKENS, 6000),
    monthlyBudgetUsd: numEnv(env.AKIF_MONTHLY_BUDGET_USD, 20),
  }
}

// --- Maliyet tahmini ----------------------------------------------------

// USD / 1M token (giriş, çıkış). 2025 sonu OpenAI fiyatları.
interface Price {
  in: number
  out: number
}

const PRICES: Record<string, Price> = {
  'gpt-4o-mini': { in: 0.15, out: 0.6 },
  'gpt-4o': { in: 2.5, out: 10 },
}

// Bilinmeyen model → kaba üst sınır (gpt-4o).
const FALLBACK_PRICE: Price = PRICES['gpt-4o']

export function estimateCostUsd(
  model: string,
  promptTokens: number,
  completionTokens: number,
): number {
  const p = PRICES[model] ?? FALLBACK_PRICE
  return (promptTokens / 1e6) * p.in + (completionTokens / 1e6) * p.out
}

// --- Model sarmalayıcı --------------------------------------------------

type CreateParams = Parameters<OpenAI['chat']['completions']['create']>[0]

interface RawMessage {
  content?: string | null
  tool_calls?: Array<{
    id?: string
    function?: { name?: string; arguments?: string }
  }> | null
}

interface RawResponse {
  choices?: Array<{ message?: RawMessage }>
  usage?: { prompt_tokens?: number; completion_tokens?: number } | null
}

function readUsage(resp: RawResponse): TokenUsage {
  return {
    promptTokens: resp.usage?.prompt_tokens ?? 0,
    completionTokens: resp.usage?.completion_tokens ?? 0,
  }
}

export function createAkifModel(deps: AkifModelDeps): {
  chatWithTools(messages: ChatMsg[]): Promise<ChatWithToolsResult>
  finalStructured(
    messages: ChatMsg[],
  ): Promise<{ turnRaw: unknown; usage: TokenUsage }>
} {
  const create = (params: unknown) =>
    deps.client.chat.completions.create(
      params as CreateParams,
    ) as unknown as Promise<RawResponse>

  return {
    async chatWithTools(messages: ChatMsg[]): Promise<ChatWithToolsResult> {
      const resp = await create({
        model: deps.model,
        messages,
        tools: AKIF_TOOL_DEFS,
        tool_choice: 'auto',
      })
      const usage = readUsage(resp)
      const message = resp.choices?.[0]?.message ?? {}
      const tc = message.tool_calls?.[0]
      if (tc) {
        return {
          kind: 'tool_call',
          toolName: tc.function?.name,
          toolArgs: JSON.parse(tc.function?.arguments ?? '{}'),
          toolCallId: tc.id,
          usage,
        }
      }
      return { kind: 'text', text: message.content ?? '', usage }
    },

    async finalStructured(
      messages: ChatMsg[],
    ): Promise<{ turnRaw: unknown; usage: TokenUsage }> {
      const resp = await create({
        model: deps.model,
        messages,
        // Araç şeması bağlamda kalsın ama 2. çağrıda YENİ araç çağrısı YASAK —
        // bu çağrının tek görevi yapılandırılmış JSON üretmek (final review I5).
        tools: AKIF_TOOL_DEFS,
        tool_choice: 'none',
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'akif_turn',
            schema: AKIF_TURN_JSON_SCHEMA,
            strict: true,
          },
        },
      })
      const usage = readUsage(resp)
      const content = resp.choices?.[0]?.message?.content ?? '{}'
      return { turnRaw: JSON.parse(content), usage }
    },
  }
}
