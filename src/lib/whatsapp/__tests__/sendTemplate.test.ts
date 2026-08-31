import { createSendTemplate, createSendDigest, createSendAlert } from '../sendTemplate'

const cfg = { verifyToken: 'v', appSecret: 's', accessToken: 'TOK', phoneNumberId: 'PN', graphVersion: 'v21.0' }

describe('createSendTemplate', () => {
  it('Graph API template gövdesi', async () => {
    const f = jest.fn().mockResolvedValue({ ok: true, status: 200, text: async () => '' })
    const ok = await createSendTemplate({ fetch: f as never, config: cfg })(
      '905321234567',
      'arsabil_aylik_ozet',
      ['Uğurlu', '4.900 ₺/m²', '%4,2 artış', 'https://x'],
    )
    expect(ok).toBe(true)
    const body = JSON.parse(f.mock.calls[0][1].body)
    expect(body).toMatchObject({
      type: 'template',
      to: '905321234567',
      template: { name: 'arsabil_aylik_ozet', language: { code: 'tr' } },
    })
    expect(body.template.components[0].parameters).toEqual([
      { type: 'text', text: 'Uğurlu' },
      { type: 'text', text: '4.900 ₺/m²' },
      { type: 'text', text: '%4,2 artış' },
      { type: 'text', text: 'https://x' },
    ])
  })

  it('!ok → console.error, throw yok, ham gövde loglanmaz', async () => {
    const f = jest
      .fn()
      .mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => '{"error":{"code":131030,"type":"OAuthException","message":"generic"}}',
      })
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    await expect(
      createSendTemplate({ fetch: f as never, config: cfg })('905321234567', 't', []),
    ).resolves.toBe(false)
    const logged = spy.mock.calls[0].join(' ')
    expect(logged).toContain('131030')
    expect(logged).not.toContain('905321234567')
    expect(logged).not.toContain('"error"')
    spy.mockRestore()
  })

  it('fetch reject → throw yok', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    await expect(
      createSendTemplate({
        fetch: jest.fn().mockRejectedValue(new Error('net')) as never,
        config: cfg,
      })('9', 't', []),
    ).resolves.toBe(false)
    spy.mockRestore()
  })
})

describe('createSendDigest', () => {
  it('şablon + parametre eşlemesi', async () => {
    const send = jest.fn().mockResolvedValue(undefined)
    await createSendDigest(send)('9', {
      mahalle: 'Uğurlu',
      current: 4900,
      pctText: '%4,2 artış',
      href: 'https://x',
    })
    expect(send).toHaveBeenCalledWith('9', 'arsabil_aylik_ozet', [
      'Uğurlu',
      '4.900 ₺/m²',
      '%4,2 artış',
      'https://x',
    ])
  })
})

describe('createSendAlert', () => {
  it('şablon + parametre eşlemesi', async () => {
    const send = jest.fn().mockResolvedValue(undefined)
    await createSendAlert(send)('9', {
      mahalle: 'Uğurlu',
      pctText: '%4,2 artış',
      baseline: 4500,
      current: 5000,
      href: 'https://x',
    })
    expect(send).toHaveBeenCalledWith('9', 'arsabil_fiyat_uyarisi', [
      'Uğurlu',
      '%4,2 artış',
      '4.500 ₺/m²',
      '5.000 ₺/m²',
      'https://x',
    ])
  })
})
