import type OpenAI from 'openai'
import {
  createAkifModel,
  readAkifEnv,
  estimateCostUsd,
  type AkifModelDeps,
  type ChatMsg,
} from '../openaiClient'

type CreateFn = (...args: unknown[]) => Promise<unknown>

function fakeDeps(createImpl: CreateFn): {
  deps: AkifModelDeps
  calls: unknown[][]
} {
  const calls: unknown[][] = []
  const create: CreateFn = (...args) => {
    calls.push(args)
    return createImpl(...args)
  }
  const client = { chat: { completions: { create } } } as unknown as Pick<
    OpenAI,
    'chat'
  >
  return { deps: { client, model: 'gpt-4o-mini' }, calls }
}

const MSGS: ChatMsg[] = [{ role: 'user', content: 'emsal nedir?' }]

describe('createAkifModel.chatWithTools', () => {
  it('tool_calls response → kind:tool_call with parsed args, name, id, usage', async () => {
    const { deps, calls } = fakeDeps(async () => ({
      choices: [
        {
          message: {
            tool_calls: [
              {
                id: 'call_abc',
                function: {
                  name: 'explainTerm',
                  arguments: '{"term":"emsal"}',
                },
              },
            ],
          },
        },
      ],
      usage: { prompt_tokens: 120, completion_tokens: 8 },
    }))
    const model = createAkifModel(deps)
    const res = await model.chatWithTools(MSGS)
    expect(res.kind).toBe('tool_call')
    expect(res.toolName).toBe('explainTerm')
    expect(res.toolArgs).toEqual({ term: 'emsal' })
    expect(res.toolCallId).toBe('call_abc')
    expect(res.usage).toEqual({ promptTokens: 120, completionTokens: 8 })
    const arg = calls[0][0] as Record<string, unknown>
    expect(arg.tool_choice).toBe('auto')
    expect(Array.isArray(arg.tools)).toBe(true)
  })

  it('content response → kind:text with text + usage', async () => {
    const { deps } = fakeDeps(async () => ({
      choices: [{ message: { content: 'Emsal, inşaat hakkıdır.' } }],
      usage: { prompt_tokens: 40, completion_tokens: 12 },
    }))
    const res = await createAkifModel(deps).chatWithTools(MSGS)
    expect(res.kind).toBe('text')
    expect(res.text).toBe('Emsal, inşaat hakkıdır.')
    expect(res.usage).toEqual({ promptTokens: 40, completionTokens: 12 })
  })

  it('missing usage → zeros', async () => {
    const { deps } = fakeDeps(async () => ({
      choices: [{ message: { content: 'x' } }],
    }))
    const res = await createAkifModel(deps).chatWithTools(MSGS)
    expect(res.usage).toEqual({ promptTokens: 0, completionTokens: 0 })
  })

  it('API errors propagate (no retry)', async () => {
    let n = 0
    const { deps } = fakeDeps(async () => {
      n++
      throw new Error('rate_limited')
    })
    await expect(createAkifModel(deps).chatWithTools(MSGS)).rejects.toThrow(
      'rate_limited',
    )
    expect(n).toBe(1)
  })
})

describe('createAkifModel.finalStructured', () => {
  it('returns parsed turnRaw + usage and sends strict json_schema response_format', async () => {
    const { deps, calls } = fakeDeps(async () => ({
      choices: [{ message: { content: '{"intent":"explain_term","speech":"x"}' } }],
      usage: { prompt_tokens: 200, completion_tokens: 30 },
    }))
    const res = await createAkifModel(deps).finalStructured(MSGS)
    expect(res.turnRaw).toEqual({ intent: 'explain_term', speech: 'x' })
    expect(res.usage).toEqual({ promptTokens: 200, completionTokens: 30 })
    const arg = calls[0][0] as {
      response_format: {
        type: string
        json_schema: { name: string; strict: boolean; schema: unknown }
      }
    }
    expect(arg.response_format.type).toBe('json_schema')
    expect(arg.response_format.json_schema.strict).toBe(true)
    expect(arg.response_format.json_schema.name).toBe('akif_turn')
  })

  it('empty content → parses to {}', async () => {
    const { deps } = fakeDeps(async () => ({
      choices: [{ message: {} }],
      usage: { prompt_tokens: 1, completion_tokens: 1 },
    }))
    const res = await createAkifModel(deps).finalStructured(MSGS)
    expect(res.turnRaw).toEqual({})
  })
})

describe('readAkifEnv', () => {
  it('throws akif_unavailable when OPENAI_API_KEY missing', () => {
    expect(() => readAkifEnv({})).toThrow('akif_unavailable')
  })

  it('defaults model / maxTurnTokens / monthlyBudgetUsd', () => {
    const cfg = readAkifEnv({ OPENAI_API_KEY: 'k' })
    expect(cfg.apiKey).toBe('k')
    expect(cfg.model).toBe('gpt-4o-mini')
    expect(cfg.maxTurnTokens).toBe(6000)
    expect(cfg.monthlyBudgetUsd).toBe(20)
  })

  it('honors overrides', () => {
    const cfg = readAkifEnv({
      OPENAI_API_KEY: 'k',
      AKIF_MODEL: 'gpt-4o',
      AKIF_MAX_TURN_TOKENS: '9000',
      AKIF_MONTHLY_BUDGET_USD: '50',
    })
    expect(cfg.model).toBe('gpt-4o')
    expect(cfg.maxTurnTokens).toBe(9000)
    expect(cfg.monthlyBudgetUsd).toBe(50)
  })

  it('empty-string / NaN / non-positive numeric env → fallback (final review I2)', () => {
    expect(readAkifEnv({ OPENAI_API_KEY: 'k', AKIF_MAX_TURN_TOKENS: '' }).maxTurnTokens).toBe(6000)
    expect(readAkifEnv({ OPENAI_API_KEY: 'k', AKIF_MAX_TURN_TOKENS: 'abc' }).maxTurnTokens).toBe(6000)
    expect(readAkifEnv({ OPENAI_API_KEY: 'k', AKIF_MAX_TURN_TOKENS: '-5' }).maxTurnTokens).toBe(6000)
    expect(readAkifEnv({ OPENAI_API_KEY: 'k', AKIF_MONTHLY_BUDGET_USD: '' }).monthlyBudgetUsd).toBe(20)
    expect(readAkifEnv({ OPENAI_API_KEY: 'k', AKIF_MAX_TURN_TOKENS: '3000' }).maxTurnTokens).toBe(3000)
  })
})

describe('estimateCostUsd', () => {
  it('gpt-4o-mini: 1M in + 1M out ≈ 0.75', () => {
    expect(estimateCostUsd('gpt-4o-mini', 1_000_000, 1_000_000)).toBeCloseTo(
      0.75,
      6,
    )
  })

  it('small usage → small positive number', () => {
    const c = estimateCostUsd('gpt-4o-mini', 1000, 500)
    expect(c).toBeGreaterThan(0)
    expect(c).toBeLessThan(0.01)
  })

  it('unknown model → conservative gpt-4o upper bound', () => {
    expect(estimateCostUsd('some-future-model', 1_000_000, 1_000_000)).toBeCloseTo(
      12.5,
      6,
    )
  })
})
