import { COMPARISON_RULES_PROMPT } from '../prompts/comparisonRules'
import { assembleSystemPrompt } from '../prompts/assemble'

describe('COMPARISON_RULES_PROMPT', () => {
  it('kıyas kuralı anahtar ifadelerini içerir', () => {
    expect(COMPARISON_RULES_PROMPT).toContain('satır satır')
    expect(COMPARISON_RULES_PROMPT).toContain('recommendation')
    expect(COMPARISON_RULES_PROMPT).toContain('upgradeHint')
    expect(COMPARISON_RULES_PROMPT).toContain('compareParcels')
  })

  it('görüş istekleri yalnız kart verisine ve recommendation alanına dayanır', () => {
    expect(COMPARISON_RULES_PROMPT).toContain('yalnızca kartın verisine ve recommendation alanına dayandır')
    expect(COMPARISON_RULES_PROMPT).toContain('güvenilir bir seçim yapılamadığını söyle')
    expect(COMPARISON_RULES_PROMPT).toContain('note alanını aktar')
    expect(COMPARISON_RULES_PROMPT).toContain('öneri ve detayın üyelikle açılacağını söyle')
    expect(COMPARISON_RULES_PROMPT).toContain('Asla kendi seçimini uydurma')
  })

  it('satır satır okumada 2–3 cümle sınırı uygulanmaz', () => {
    expect(COMPARISON_RULES_PROMPT).toContain('2–3 cümle sınırı bu cevap için geçerli değildir')
  })

  it('assembleSystemPrompt (WhatsApp yolu) kıyas kurallarını içermez', () => {
    const out = assembleSystemPrompt({ hasHistory: false })
    expect(out).not.toContain(COMPARISON_RULES_PROMPT)
    expect(out).not.toContain('upgradeHint')
  })
})
