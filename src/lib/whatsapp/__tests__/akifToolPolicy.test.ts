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
    expect(p).toContain('not_found')
    expect(p).toContain('degisiklikYok')
    expect(p).toContain('dahaFazlaVar')
    expect(p).toContain('adDegisti')
    expect(p).toContain('degisti')
  })

  it('Aşama C hesap kurallarını içerir', () => {
    const p = AKIF_WHATSAPP_PROJECT_POLICY
    for (const k of ['estimateDaireFiyati', 'calculateProject', 'price_estimate', 'price_unavailable', 'calculated', 'yapilamaz', 'fiyatBayat', 'pazarlık']) {
      expect(p).toContain(k)
    }
  })

  it('her tur tek araç: sıralı akış ifadeleri', () => {
    const p = AKIF_WHATSAPP_PROJECT_POLICY
    expect(p).not.toContain('ardından calculateProject')
    for (const k of ['bir sonraki', 'Hesaplayayım mı?', 'xMaxYuzde', 'daireM2Varsayilan', 'daireFiyati', 'ilan', 'sonraki bir turda']) {
      expect(p).toContain(k)
    }
  })

  it('aynı turda iki araç ima eden ifade yok; yapilamaz ve xMaxYuzde null kuralları', () => {
    const p = AKIF_WHATSAPP_PROJECT_POLICY
    expect(p).not.toContain('rememberFact ile kaydet, calculateProject çağır')
    expect(p).not.toMatch(/rememberFact[^.\n]*,\s*calculateProject çağır/)
    expect(p).toContain("calculateProject'i bir sonraki turda çağır")
    expect(p).toContain('satirlar dahil hiçbir yüzde, pay veya daire sayısı anlatma')
    expect(p).toContain('null ise hiç yüzde verme')
  })

  it('x_max tavanı: asiyor alanı ve uygulanabilir değil ifadesi', () => {
    const p = AKIF_WHATSAPP_PROJECT_POLICY
    expect(p).toContain('asiyor')
    expect(p).toContain('en fazla yaklaşık %<xMaxYuzde> arsa payı verebilir')
    expect(p).toContain('uygulanabilir OLMADIĞINI')
  })

  it('onay turu: BEKLEYEN FİYAT TAHMİNİ bloğu, kullanici kaynağı, blok yoksa tekrar iste', () => {
    const p = AKIF_WHATSAPP_PROJECT_POLICY
    expect(p).toContain('BEKLEYEN FİYAT TAHMİNİ')
    expect(p).toContain('source: kullanici')
    expect(p).toContain('isteği tekrarlamasını iste')
  })

  it('politika boşlukları: createProject önce, fiyatı getireyim mi, emsal uydurma', () => {
    const p = AKIF_WHATSAPP_PROJECT_POLICY
    expect(p).toContain('projesi yoksa önce createProject')
    expect(p).toContain('fiyatı getireyim mi?')
    expect(p).toContain('emsali ASLA uydurma')
    expect(p).toContain('imar durumu belgesinden')
  })
})
