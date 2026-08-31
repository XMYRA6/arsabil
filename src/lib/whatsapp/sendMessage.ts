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
        console.error(`[wa] send failed ${res.status} to ${mask(to)}: ${await res.text()}`)
      }
    } catch (e) {
      console.error(`[wa] send error to ${mask(to)}:`, e)
    }
  }
}
