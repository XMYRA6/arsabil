import { createSendText } from '../sendMessage'
import type { WhatsappConfig } from '../config'

const cfg: WhatsappConfig = {
  verifyToken: 'v', appSecret: 's', accessToken: 'TOKEN',
  phoneNumberId: 'PNID', graphVersion: 'v21.0',
}

describe('createSendText', () => {
  it('Graph API\'ye doğru URL + gövde ile POST atar', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200, text: async () => '' })
    const send = createSendText({ fetch: fetchMock as never, config: cfg })
    await send('905321234567', 'merhaba')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://graph.facebook.com/v21.0/PNID/messages')
    expect(init.method).toBe('POST')
    expect(init.headers.Authorization).toBe('Bearer TOKEN')
    const body = JSON.parse(init.body)
    expect(body).toMatchObject({ messaging_product: 'whatsapp', to: '905321234567', type: 'text', text: { body: 'merhaba' } })
  })
  it('yanıt ok değilse throw ETMEZ (loglar)', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: false, status: 400, text: async () => 'bad' })
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const send = createSendText({ fetch: fetchMock as never, config: cfg })
    await expect(send('905321234567', 'x')).resolves.toBeUndefined()
    expect(errSpy).toHaveBeenCalledWith(expect.stringContaining('400'))
    errSpy.mockRestore()
  })
  it('Meta hata gövdesindeki numara/detay loglanmaz, sadece status+code+type+message', async () => {
    const body = JSON.stringify({
      error: {
        code: 131030,
        type: 'OAuthException',
        message: 'Recipient phone number not in allowed list',
        error_data: { details: 'to=905321234567 blocked' },
      },
    })
    const fetchMock = jest.fn().mockResolvedValue({ ok: false, status: 400, text: async () => body })
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const send = createSendText({ fetch: fetchMock as never, config: cfg })
    await send('905321234567', 'x')
    const logged = errSpy.mock.calls[0].join(' ')
    expect(logged).toContain('131030')
    expect(logged).toContain('OAuthException')
    expect(logged).not.toContain('905321234567')
    expect(logged).not.toContain('error_data')
    errSpy.mockRestore()
  })
  it('fetch reject olsa da throw ETMEZ', async () => {
    const fetchMock = jest.fn().mockRejectedValue(new Error('net'))
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const send = createSendText({ fetch: fetchMock as never, config: cfg })
    await expect(send('905321234567', 'x')).resolves.toBeUndefined()
    errSpy.mockRestore()
  })
})
