import { safeStaticParams } from './staticParams'
import type { SeoAreaEntry } from './listSeoAreas'

const entry = { ilSlug: 'trabzon' } as SeoAreaEntry

describe('safeStaticParams', () => {
  it('maps entries to params', async () => {
    const r = await safeStaticParams('il', (e) => ({ il: e.ilSlug }), async () => [entry])
    expect(r).toEqual([{ il: 'trabzon' }])
  })

  it('returns [] instead of throwing when the database is unreachable', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const r = await safeStaticParams('il', (e) => ({ il: e.ilSlug }), async () => {
      throw new Error("Can't reach database server")
    })
    expect(r).toEqual([])
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()
  })
})
