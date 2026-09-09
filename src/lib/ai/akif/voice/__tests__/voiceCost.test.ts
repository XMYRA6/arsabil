import { estimateVoiceCostUsd } from '../voiceCost'

describe('estimateVoiceCostUsd', () => {
  it('usage verilince token-bazlı hesaplar (gpt-realtime-mini: $10/$20 per Mtok)', () => {
    // 60k input + 30k output audio token
    const usd = estimateVoiceCostUsd({
      model: 'gpt-realtime-mini',
      durationSec: 300,
      usage: { inputAudioTokens: 60_000, outputAudioTokens: 30_000 },
    })
    // 60000/1e6*10 + 30000/1e6*20 = 0.6 + 0.6 = 1.2
    expect(usd).toBeCloseTo(1.2, 5)
  })

  it('usage yoksa süre-bazlı yaklaşık hesap', () => {
    const usd = estimateVoiceCostUsd({ model: 'gpt-realtime-mini', durationSec: 600, usage: null })
    expect(usd).toBeGreaterThan(0)
    expect(usd).toBeLessThan(1) // 10 dk mini ~ $0.2-0.5
  })

  it('gpt-realtime tam model mini den pahalı', () => {
    const mini = estimateVoiceCostUsd({ model: 'gpt-realtime-mini', durationSec: 300, usage: null })
    const full = estimateVoiceCostUsd({ model: 'gpt-realtime', durationSec: 300, usage: null })
    expect(full).toBeGreaterThan(mini)
  })

  it('bilinmeyen model TAM (pahalı) tarifeye düşer — para guard fail-closed', () => {
    const unknown = estimateVoiceCostUsd({ model: 'gpt-99', durationSec: 300, usage: null })
    const full = estimateVoiceCostUsd({ model: 'gpt-realtime', durationSec: 300, usage: null })
    const mini = estimateVoiceCostUsd({ model: 'gpt-realtime-mini', durationSec: 300, usage: null })
    expect(unknown).toBe(full)
    expect(unknown).toBeGreaterThan(mini)
  })

  it('gpt-realtime-2.1 (key değil) → TAM tarife, mini değil', () => {
    const v21 = estimateVoiceCostUsd({ model: 'gpt-realtime-2.1', durationSec: 300, usage: null })
    const full = estimateVoiceCostUsd({ model: 'gpt-realtime', durationSec: 300, usage: null })
    const mini = estimateVoiceCostUsd({ model: 'gpt-realtime-mini', durationSec: 300, usage: null })
    expect(v21).toBe(full)
    expect(v21).toBeGreaterThan(mini)
  })

  it('gpt-realtime-mini-2 → mini tarife (prefix)', () => {
    const m2 = estimateVoiceCostUsd({ model: 'gpt-realtime-mini-2', durationSec: 300, usage: null })
    const mini = estimateVoiceCostUsd({ model: 'gpt-realtime-mini', durationSec: 300, usage: null })
    expect(m2).toBe(mini)
  })

  it('sıfır süre + usage yok → 0', () => {
    expect(estimateVoiceCostUsd({ model: 'gpt-realtime-mini', durationSec: 0, usage: null })).toBe(0)
  })
})
