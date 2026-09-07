import { TOKEN_URL } from './datasets'
import { FatalError, REQUEST_TIMEOUT_MS, retryTransient } from './retry'

/**
 * TÜİK SDMX erişim token'ı alır (password grant + api_key).
 *
 * Giriş sunucusu aralıklı olarak HTML hata sayfası / 5xx dönüyor — geçici
 * hatalarda `retryTransient` ile tekrar denenir. 4xx (kötü api_key) anında fırlar.
 */
export async function getAccessToken(deps: { fetch: typeof fetch; apiKey: string }): Promise<string> {
  const body = new URLSearchParams({
    grant_type: 'password',
    client_id: 'nsi-ws-consumer',
    api_key: deps.apiKey,
  })

  return retryTransient(async () => {
    const res = await deps.fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    const text = await res.text()

    if (!res.ok) {
      const msg = `TÜİK token alınamadı (HTTP ${res.status})`
      // 4xx = kalıcı (kötü api_key); 5xx = geçici, tekrar denenebilir.
      throw res.status < 500 ? new FatalError(msg) : new Error(msg)
    }

    let json: { access_token?: string }
    try {
      json = JSON.parse(text) as { access_token?: string }
    } catch {
      // Geçici proxy/hata sayfası (HTML) — tekrar denenebilir.
      throw new Error('TÜİK token yanıtı JSON değil (geçici hata olabilir)')
    }
    if (!json.access_token) {
      throw new FatalError('TÜİK token yanıtında access_token yok')
    }
    return json.access_token
  })
}
