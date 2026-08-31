import { assembleSystemPrompt } from '../prompts/assemble'
import { PERSONA_PROMPT } from '../prompts/persona'
import { DOMAIN_PROMPT } from '../prompts/domain'
import { CONVERSATION_POLICY_PROMPT } from '../prompts/conversationPolicy'
import { TOOL_POLICY_PROMPT } from '../prompts/toolPolicy'
import { SAFETY_POLICY_PROMPT } from '../prompts/safetyPolicy'
import { DIALECT_PROMPT } from '../prompts/dialect'
import { HUMOR_PROMPT } from '../prompts/humor'

const FIRST_MESSAGE_MARKER = 'ilk mesaj'

describe('prompt katmanları', () => {
  const layers = {
    PERSONA_PROMPT,
    DOMAIN_PROMPT,
    CONVERSATION_POLICY_PROMPT,
    TOOL_POLICY_PROMPT,
    SAFETY_POLICY_PROMPT,
    DIALECT_PROMPT,
    HUMOR_PROMPT,
  }

  it.each(Object.entries(layers))('%s dolu bir string', (_name, value) => {
    expect(typeof value).toBe('string')
    expect(value.trim().length).toBeGreaterThan(80)
  })

  it('persona "Akif Usta" içerir', () => {
    expect(PERSONA_PROMPT).toContain('Akif Usta')
  })

  it('domain tahmin/varsayım/doğrulanmış bilgi ayrımını içerir', () => {
    expect(DOMAIN_PROMPT).toMatch(/tahmin/i)
    expect(DOMAIN_PROMPT).toMatch(/varsayım/i)
    expect(DOMAIN_PROMPT).toMatch(/doğrulanmış/i)
  })

  it('toolPolicy hesabı kendin yapma / aracı çağır talimatı içerir', () => {
    const t = TOOL_POLICY_PROMPT.toLocaleLowerCase('tr')
    expect(t.includes('aracı çağır') || t.includes('hesabı asla kendin yapma')).toBe(true)
  })

  it('safetyPolicy kesinlik dili yasağı içerir', () => {
    expect(SAFETY_POLICY_PROMPT).toMatch(/kesinlikle şu kadar eder/i)
  })

  it('dialect fonetik transkripsiyon yasağını içerir', () => {
    expect(DIALECT_PROMPT.toLocaleLowerCase('tr')).toContain('fonetik')
  })
})

describe('assembleSystemPrompt', () => {
  it('7 parçayı sabit sırayla birleştirir', () => {
    const out = assembleSystemPrompt({ hasHistory: true })
    const idx = [
      PERSONA_PROMPT,
      DOMAIN_PROMPT,
      CONVERSATION_POLICY_PROMPT,
      TOOL_POLICY_PROMPT,
      SAFETY_POLICY_PROMPT,
      DIALECT_PROMPT,
      HUMOR_PROMPT,
    ].map((p) => out.indexOf(p.trim()))
    expect(idx.every((i) => i >= 0)).toBe(true)
    const sorted = [...idx].sort((a, b) => a - b)
    expect(idx).toEqual(sorted)
    expect(out).toContain('\n\n---\n\n')
  })

  it('anahtar cümleleri içerir', () => {
    const out = assembleSystemPrompt({ hasHistory: false })
    expect(out).toContain('Akif Usta')
    expect(out).toMatch(/aracı çağır|hesabı asla kendin yapma/i)
    expect(out).toMatch(/kesinlikle şu kadar eder/i)
  })

  it('800 karakterden uzun', () => {
    expect(assembleSystemPrompt({ hasHistory: false }).length).toBeGreaterThan(800)
  })

  it('deterministik — aynı ctx aynı string', () => {
    expect(assembleSystemPrompt({ hasHistory: false })).toBe(
      assembleSystemPrompt({ hasHistory: false }),
    )
    expect(assembleSystemPrompt({ hasHistory: true })).toBe(
      assembleSystemPrompt({ hasHistory: true }),
    )
  })

  it('hasHistory:false ilk mesaj notunu ekler, true eklemez', () => {
    expect(assembleSystemPrompt({ hasHistory: false })).toContain(FIRST_MESSAGE_MARKER)
    expect(assembleSystemPrompt({ hasHistory: true })).not.toContain(FIRST_MESSAGE_MARKER)
  })
})
