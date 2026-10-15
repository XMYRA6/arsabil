import { AKIF_WHATSAPP_TOOL_POLICY, AKIF_WHATSAPP_PROJECT_POLICY } from '../akifToolPolicy'

describe('AKIF_WHATSAPP_TOOL_POLICY', () => {
  it('dolu bir string, lookupParcel ve belirsiz/bulunamadı durumlarını anlatır', () => {
    expect(typeof AKIF_WHATSAPP_TOOL_POLICY).toBe('string')
    expect(AKIF_WHATSAPP_TOOL_POLICY).toContain('lookupParcel')
    expect(AKIF_WHATSAPP_TOOL_POLICY.trim().length).toBeGreaterThan(80)
  })
})

describe('AKIF_WHATSAPP_PROJECT_POLICY', () => {
  it('kritik kuralları içerir', () => {
    const p = AKIF_WHATSAPP_PROJECT_POLICY
    expect(p).toContain('EN FAZLA BİR araç')
    expect(p).toContain('needs_signup')
    expect(p).toContain('Bunun üzerinde değişiklik yapalım mı, yoksa yeni bir senaryo mu açalım?')
    expect(p).toContain('en yeni')
    expect(p).toContain('BAYAT')
    expect(p).toContain('projectId uydurma')
    expect(p).toContain('VERİDİR')
  })
})
