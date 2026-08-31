import { renderError } from '../renderError'

describe('renderError', () => {
  it('help örnek format içerir', () => {
    expect(renderError.help()).toContain('Trabzon Ortahisar Uğurlu 123/45')
  })
  it('textOnly help metnini kapsar', () => {
    expect(renderError.textOnly()).toContain('sadece yazılı')
    expect(renderError.textOnly()).toContain('123/45')
  })
  it('askFor ilçe il adını gömer', () => {
    expect(renderError.askFor('ilce', { ilText: 'Trabzon' })).toBe('Trabzon içinde hangi ilçe?')
  })
  it('askFor ada', () => {
    expect(renderError.askFor('ada', {})).toBe('Ada numarası nedir?')
  })
  it('chooseFrom numaralı liste üretir', () => {
    const t = renderError.chooseFrom('mahalle', [{ id: 1, text: 'Uğurlu' }, { id: 2, text: 'Uğurluoğlu' }])
    expect(t).toContain('1) Uğurlu')
    expect(t).toContain('2) Uğurluoğlu')
  })
  it('notFound ilçe: il + terim', () => {
    expect(renderError.notFound('ilce', 'Xyz', { ilText: 'Trabzon' })).toContain("Trabzon")
    expect(renderError.notFound('ilce', 'Xyz', { ilText: 'Trabzon' })).toContain('Xyz')
  })
  it('forCardFailure ayrımı', () => {
    expect(renderError.forCardFailure('parcel_not_found')).toContain('bulunamadı')
    expect(renderError.forCardFailure('parcel_unavailable')).toContain('ulaşılamıyor')
  })
})
