import { buildRealtimeSessionConfig } from '../realtimeSession'
import { AKIF_TOOL_DEFS } from '../../gateway/toolRegistry'
import { ACTION_TOOL_DEFS } from '../../gateway/actionTools'
import { RICH_EXTRA_TOOL_DEFS } from '../../gateway/richTools'

describe('buildRealtimeSessionConfig', () => {
  const cfg = buildRealtimeSessionConfig({ model: 'gpt-realtime-mini', voiceName: 'marin' })

  it('model ve ses adını yerleştirir', () => {
    expect(cfg.model).toBe('gpt-realtime-mini')
    expect(cfg.audio.output.voice).toBe('marin')
  })

  it('semantic_vad kullanır', () => {
    expect(cfg.audio.input.turn_detection).toEqual({ type: 'semantic_vad' })
  })

  it('input transcription açık — kullanıcı transkripti için şart', () => {
    expect(cfg.audio.input.transcription.model).toBeTruthy()
    expect(typeof cfg.audio.input.transcription.model).toBe('string')
  })

  it('instructions Akif sistem prompt + ses ritmi ekini içerir', () => {
    expect(cfg.instructions).toMatch(/SES PERFORMANSI/)
    // Akif personası: sistem prompt'tan bir çapa kelime
    expect(cfg.instructions.length).toBeGreaterThan(500)
  })

  it('tools include compareParcels', () => {
    const names = (cfg.tools as { function: { name: string } }[]).map((t) => t.function.name)
    expect(names).toContain('compareParcels')
  })

  it('AKIF_TOOL_DEFS + ACTION_TOOL_DEFS birleştirilerek aktarılır', () => {
    expect(cfg.tools).toEqual([...AKIF_TOOL_DEFS, ...ACTION_TOOL_DEFS, ...RICH_EXTRA_TOOL_DEFS])
    expect(cfg.tool_choice).toBe('auto')
  })

  it('aksiyon araçları (prepareScenarioSave, commitPendingAction) hesaplayıcı araçların yanında bulunur', () => {
    const names = (cfg.tools as { function: { name: string } }[]).map((t) => t.function.name)
    expect(names).toEqual(
      expect.arrayContaining(['explainTerm', 'compareContractorOffers', 'compareApartmentSizes', 'prepareScenarioSave', 'commitPendingAction']),
    )
  })

  it('type realtime', () => {
    expect(cfg.type).toBe('realtime')
  })
})
