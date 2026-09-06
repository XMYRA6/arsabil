import { getAccessToken } from '../../tuik/auth'

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body, text: async () => JSON.stringify(body) } as Response
}

describe('getAccessToken', () => {
  it('token uç noktasına password grant + api_key gönderir, access_token döner', async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = []
    const fakeFetch = (async (url: string, init?: RequestInit) => {
      calls.push({ url, init })
      return jsonResponse({ access_token: 'tok-123', expires_in: 300 })
    }) as unknown as typeof fetch

    const token = await getAccessToken({ fetch: fakeFetch, apiKey: 'KEY-abc' })

    expect(token).toBe('tok-123')
    expect(calls[0].url).toContain('/realms/web/protocol/openid-connect/token')
    const body = String(calls[0].init?.body)
    expect(body).toContain('grant_type=password')
    expect(body).toContain('client_id=nsi-ws-consumer')
    expect(body).toContain('api_key=KEY-abc')
  })

  it('non-200 → anlamlı hata fırlatır', async () => {
    const fakeFetch = (async () => jsonResponse({ error: 'invalid_grant' }, false, 401)) as unknown as typeof fetch
    await expect(getAccessToken({ fetch: fakeFetch, apiKey: 'bad' })).rejects.toThrow(/token alınamadı|401/i)
  })

  it('yanıtta access_token yoksa → hata fırlatır', async () => {
    const fakeFetch = (async () => jsonResponse({ expires_in: 300 })) as unknown as typeof fetch
    await expect(getAccessToken({ fetch: fakeFetch, apiKey: 'x' })).rejects.toThrow(/access_token/i)
  })
})
