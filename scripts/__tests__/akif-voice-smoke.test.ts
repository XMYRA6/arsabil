import { runVoiceSmoke } from '../akif-voice-smoke'

it('anahtarsız → skipped:true, API çağrısı yok', async () => {
  const fetchFn = jest.fn()
  const r = await runVoiceSmoke({ env: {}, fetchFn: fetchFn as never })
  expect(r).toEqual({ skipped: true })
  expect(fetchFn).not.toHaveBeenCalled()
})

it('anahtarlı + config kabul → ok:true', async () => {
  const fetchFn = jest.fn().mockResolvedValue({
    ok: true, json: async () => ({ value: 'ek_x', expires_at: 1 }),
  })
  const r = await runVoiceSmoke({ env: { OPENAI_API_KEY: 'sk-x' }, fetchFn: fetchFn as never })
  expect(r).toEqual({ skipped: false, ok: true })
})

it('anahtarlı + config reddedildi → ok:false + status', async () => {
  const fetchFn = jest.fn().mockResolvedValue({ ok: false, status: 400, text: async () => 'bad tool schema' })
  const r = await runVoiceSmoke({ env: { OPENAI_API_KEY: 'sk-x' }, fetchFn: fetchFn as never })
  expect(r).toEqual({ skipped: false, ok: false, status: 400, detail: 'bad tool schema' })
})
