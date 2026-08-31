import { resolveLocation, type ResolveLocationDeps } from '../resolveLocation'

const deps = (over: Partial<ResolveLocationDeps> = {}): ResolveLocationDeps => ({
  fetchIlListesi: jest.fn().mockResolvedValue([{ id: 61, text: 'Trabzon' }, { id: 1, text: 'Adana' }]),
  fetchIlceListesi: jest.fn().mockResolvedValue([{ id: 900, text: 'Ortahisar' }, { id: 901, text: 'Akçaabat' }]),
  fetchMahalleListesi: jest.fn().mockResolvedValue([{ id: 5000, text: 'UĞURLU' }, { id: 5001, text: 'UĞURLUOĞLU' }]),
  ...over,
})

describe('resolveLocation', () => {
  it('tam zincir çözülür', async () => {
    const r = await resolveLocation(
      { ilText: 'trabzon', ilceText: 'ortahisar', mahalleText: 'uğurlu', ada: '1', parsel: '2' },
      deps(),
    )
    expect(r).toEqual({ kind: 'resolved', mahalleId: 5000, il: 'Trabzon', ilce: 'Ortahisar', mahalle: 'UĞURLU' })
  })
  it('il eşleşmezse notfound', async () => {
    const r = await resolveLocation({ ilText: 'xyz', ilceText: 'a', mahalleText: 'b' }, deps())
    expect(r).toEqual({ kind: 'notfound', level: 'il', term: 'xyz' })
  })
  it('mahalle çoklu aday → ambiguous', async () => {
    const r = await resolveLocation({ ilText: 'trabzon', ilceText: 'ortahisar', mahalleText: 'uğurl' }, deps())
    expect(r.kind).toBe('ambiguous')
    if (r.kind === 'ambiguous') {
      expect(r.level).toBe('mahalle')
      expect(r.candidates.map(c => c.id).sort()).toEqual([5000, 5001])
    }
  })
  it('ilId zaten doluysa il listesini çekmez', async () => {
    const d = deps()
    await resolveLocation(
      { ilText: 'Trabzon', ilId: 61, ilceText: 'ortahisar', mahalleText: 'uğurlu' },
      d,
    )
    expect(d.fetchIlListesi).not.toHaveBeenCalled()
    expect(d.fetchIlceListesi).toHaveBeenCalledWith(61)
  })
  it('ilçe i/İ farkıyla eşleşir', async () => {
    const d = deps({
      fetchIlceListesi: jest.fn().mockResolvedValue([{ id: 42, text: 'OF' }]),
    })
    const r = await resolveLocation(
      { ilText: 'trabzon', ilceText: 'of', mahalleText: 'uğurlu' },
      d,
    )
    expect(d.fetchMahalleListesi).toHaveBeenCalledWith(42)
    expect(r.kind).toBe('resolved')
  })
  it('mahalleId zaten doluysa mahalle listesini çekmez, doğrudan resolved döner', async () => {
    const d = deps()
    const r = await resolveLocation(
      { ilText: 'trabzon', ilceText: 'ortahisar', mahalleText: 'Uğurlu', mahalleId: 5000, ada: '1', parsel: '2' },
      d,
    )
    expect(d.fetchMahalleListesi).not.toHaveBeenCalled()
    expect(r).toEqual({ kind: 'resolved', mahalleId: 5000, il: 'Trabzon', ilce: 'Ortahisar', mahalle: 'Uğurlu' })
  })
})
