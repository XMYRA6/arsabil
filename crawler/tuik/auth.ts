import { TOKEN_URL } from './datasets'

/** TÜİK giriş sunucusu da aralıklı olarak HTML hata sayfası / 5xx dönüyor
 *  (Task 1 gözlemi) — geçici hatalarda birkaç kez dene. 4xx (kötü api_key) anında. */
const MAX_ATTEMPTS = 3
const RETRY_DELAY_MS = 2000
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

class AuthClientError extends Error {}

export async function getAccessToken(deps: { fetch: typeof fetch; apiKey: string }): Promise<string> {
  const body = new URLSearchParams({
    grant_type: 'password',
    client_id: 'nsi-ws-consumer',
    api_key: deps.apiKey,
  })

  let lastErr: Error | undefined
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await deps.fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      })
      const text = await res.text()
      if (!res.ok) {
        const msg = `TÜİK token alınamadı (HTTP ${res.status})`
        // 4xx = kalıcı (kötü api_key) — tekrar denemek anlamsız.
        throw res.status < 500 ? new AuthClientError(msg) : new Error(msg)
      }
      let json: { access_token?: string }
      try {
        json = JSON.parse(text) as { access_token?: string }
      } catch {
        // Geçici proxy/hata sayfası (HTML) — tekrar denenebilir.
        throw new Error('TÜİK token yanıtı JSON değil (geçici hata olabilir)')
      }
      if (!json.access_token) {
        throw new AuthClientError('TÜİK token yanıtında access_token yok')
      }
      return json.access_token
    } catch (err) {
      if (err instanceof AuthClientError) throw err
      lastErr = err as Error
    }
    if (attempt < MAX_ATTEMPTS) await sleep(RETRY_DELAY_MS)
  }
  throw lastErr ?? new Error('TÜİK token alınamadı')
}
