import { renderError } from '../renderError'

describe('renderError', () => {
  it('help örnek format içerir', () => {
    expect(renderError.help()).toContain('İzmir Urla İçmeler 123/45')
  })
  it('textOnly help metnini kapsar', () => {
    expect(renderError.textOnly()).toContain('sadece yazılı')
    expect(renderError.textOnly()).toContain('123/45')
  })
  it('rateLimited bekleme mesajı döner', () => {
    expect(renderError.rateLimited()).toContain('1 dakika')
  })
})
