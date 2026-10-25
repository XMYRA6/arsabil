import { COMPARISON_RULES_PROMPT } from '../prompts/comparisonRules'
import { assembleSystemPrompt } from '../prompts/assemble'

describe('COMPARISON_RULES_PROMPT', () => {
  it('kıyas kuralı anahtar ifadelerini içerir', () => {
    expect(COMPARISON_RULES_PROMPT).toContain('satır satır')
    expect(COMPARISON_RULES_PROMPT).toContain('recommendation')
    expect(COMPARISON_RULES_PROMPT).toContain('upgradeHint')
    expect(COMPARISON_RULES_PROMPT).toContain('compareParcels')
  })

  it('assembleSystemPrompt (WhatsApp yolu) kıyas kurallarını içermez', () => {
    const out = assembleSystemPrompt({ hasHistory: false })
    expect(out).not.toContain(COMPARISON_RULES_PROMPT)
    expect(out).not.toContain('upgradeHint')
  })
})
