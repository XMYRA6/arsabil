import { TOKEN_URL } from './datasets'

export async function getAccessToken(deps: { fetch: typeof fetch; apiKey: string }): Promise<string> {
  const body = new URLSearchParams({
    grant_type: 'password',
    client_id: 'nsi-ws-consumer',
    api_key: deps.apiKey,
  })
  const res = await deps.fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) {
    throw new Error(`TÜİK token alınamadı (HTTP ${res.status})`)
  }
  const json = (await res.json()) as { access_token?: string }
  if (!json.access_token) {
    throw new Error('TÜİK token yanıtında access_token yok')
  }
  return json.access_token
}
