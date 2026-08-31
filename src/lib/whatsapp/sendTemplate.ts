import type { WhatsappConfig } from './config'
import { formatTl } from './formatTl'

export interface SendTemplateDeps {
  fetch: typeof fetch
  config: WhatsappConfig
}

function mask(phone: string): string {
  return phone.length > 4 ? '***' + phone.slice(-4) : '***'
}

export function createSendTemplate(
  deps: SendTemplateDeps,
): (to: string, template: string, params: string[]) => Promise<void> {
  const { fetch: f, config } = deps
  const url = `https://graph.facebook.com/${config.graphVersion}/${config.phoneNumberId}/messages`

  return async (to, template, params) => {
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
          type: 'template',
          template: {
            name: template,
            language: { code: 'tr' },
            components: [
              {
                type: 'body',
                parameters: params.map((p) => ({ type: 'text', text: p })),
              },
            ],
          },
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
        console.error(`[wa] template failed ${res.status} to ${mask(to)}${detail}`)
      }
    } catch (e) {
      console.error(`[wa] template error to ${mask(to)}:`, e)
    }
  }
}

export function createSendDigest(
  send: ReturnType<typeof createSendTemplate>,
): (
  to: string,
  a: { mahalle: string; current: number; pctText: string; href: string },
) => Promise<void> {
  return async (to, a) => {
    await send(to, 'arsabil_aylik_ozet', [
      a.mahalle,
      formatTl(a.current) + ' ₺/m²',
      a.pctText,
      a.href,
    ])
  }
}

export function createSendAlert(
  send: ReturnType<typeof createSendTemplate>,
): (
  to: string,
  a: { mahalle: string; pctText: string; baseline: number; current: number; href: string },
) => Promise<void> {
  return async (to, a) => {
    await send(to, 'arsabil_fiyat_uyarisi', [
      a.mahalle,
      a.pctText,
      formatTl(a.baseline) + ' ₺/m²',
      formatTl(a.current) + ' ₺/m²',
      a.href,
    ])
  }
}
