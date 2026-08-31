import type { WhatsappConfig } from './config'

export interface SendDeps {
  fetch: typeof fetch
  config: WhatsappConfig
}

function mask(phone: string): string {
  return phone.length > 4 ? '***' + phone.slice(-4) : '***'
}

export function createSendText(deps: SendDeps): (to: string, body: string) => Promise<void> {
  const { fetch: f, config } = deps
  const url = `https://graph.facebook.com/${config.graphVersion}/${config.phoneNumberId}/messages`
  return async (to, body) => {
    try {
      const res = await f(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body, preview_url: true },
        }),
      })
      if (!res.ok) {
        // Meta hata gövdesi alıcı numarasını / istek detayını yankılayabilir — ham gövdeyi ASLA loglama (spec §8).
        let detail = ''
        try {
          const parsed = JSON.parse(await res.text()) as {
            error?: { code?: number; type?: string; message?: string }
          }
          const err = parsed?.error
          if (err) {
            detail = ` code=${err.code ?? '?'} type=${err.type ?? '?'} message=${err.message ?? '?'}`
          }
        } catch {
          // gövde JSON değil → sadece status logla
        }
        console.error(`[wa] send failed ${res.status} to ${mask(to)}${detail}`)
      }
    } catch (e) {
      console.error(`[wa] send error to ${mask(to)}:`, e)
    }
  }
}
