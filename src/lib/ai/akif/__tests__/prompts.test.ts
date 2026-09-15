import { assembleSystemPrompt } from '../prompts/assemble'
import { PERSONA_PROMPT } from '../prompts/persona'
import { DOMAIN_PROMPT } from '../prompts/domain'
import { CONVERSATION_POLICY_PROMPT } from '../prompts/conversationPolicy'
import { TOOL_POLICY_PROMPT } from '../prompts/toolPolicy'
import { SAFETY_POLICY_PROMPT } from '../prompts/safetyPolicy'
import { DIALECT_PROMPT } from '../prompts/dialect'
import { HUMOR_PROMPT } from '../prompts/humor'
import { MEMORY_POLICY_PROMPT } from '../prompts/memoryPolicy'

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

  it('toolPolicy hesabı kendin yapma / aracını çağır talimatı içerir', () => {
    const t = TOOL_POLICY_PROMPT.toLocaleLowerCase('tr')
    expect(t).toContain('hesabı asla kendin yapma')
    expect(t).toContain('aracını çağır')
  })

  it('toolPolicy invalid_args → clarify_number + needs_confirmation talimatı içerir', () => {
    expect(TOOL_POLICY_PROMPT).toContain('invalid_args')
    expect(TOOL_POLICY_PROMPT).toContain('clarify_number')
    expect(TOOL_POLICY_PROMPT).toContain('needs_confirmation')
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
    expect(out).toMatch(/aracını çağır|hesabı asla kendin yapma/i)
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

describe('MEMORY_POLICY_PROMPT (Akif-3)', () => {
  it('dolu bir string', () => {
    expect(typeof MEMORY_POLICY_PROMPT).toBe('string')
    expect(MEMORY_POLICY_PROMPT.trim().length).toBeGreaterThan(80)
  })
})

describe('assembleSystemPrompt — Arsa Dosyası (Akif-3)', () => {
  it('projectMemory verilmezse çıktı MEVCUT davranışla birebir aynı (regresyon kilidi)', () => {
    const out = assembleSystemPrompt({ hasHistory: true })
    expect(out).not.toContain('ARSA DOSYASI')
    expect(out).not.toContain('Bu proje hakkında bildiklerin')
  })

  it('projectMemory: null → politika katmanı var, dinamik blok yok', () => {
    const out = assembleSystemPrompt({ hasHistory: true, projectMemory: null })
    expect(out).toContain('ARSA DOSYASI')
    expect(out).not.toContain('Bu proje hakkında bildiklerin')
  })

  it('projectMemory: dolu metin → politika katmanı + dosya içeriği eklenir', () => {
    const out = assembleSystemPrompt({
      hasHistory: true,
      projectMemory: 'Bütçe üst sınırı 5M TL.',
    })
    expect(out).toContain('ARSA DOSYASI')
    expect(out).toContain('Bu proje hakkında bildiklerin:')
    expect(out).toContain('Bütçe üst sınırı 5M TL.')
  })
})
