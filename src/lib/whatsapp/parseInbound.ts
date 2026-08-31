import type { InboundMessage } from './types'

function normPhone(s: unknown): string {
  return String(s ?? '').replace(/[^\d]/g, '')
}

export function parseInbound(payload: unknown): InboundMessage[] {
  const out: InboundMessage[] = []
  const p = payload as { entry?: unknown }
  if (!p || !Array.isArray(p.entry)) return out
  for (const entry of p.entry) {
    const changes = (entry as { changes?: unknown }).changes
    if (!Array.isArray(changes)) continue
    for (const change of changes) {
      const value = (change as { value?: { messages?: unknown } }).value
      const messages = value?.messages
      if (!Array.isArray(messages)) continue
      for (const m of messages) {
        const msg = m as {
          from?: unknown; id?: unknown; timestamp?: unknown
          type?: unknown; text?: { body?: unknown }
        }
        const isText = msg.type === 'text' && typeof msg.text?.body === 'string'
        out.push({
          from: normPhone(msg.from),
          text: isText ? String(msg.text!.body) : '',
          messageId: String(msg.id ?? ''),
          timestamp: Number(msg.timestamp ?? 0),
          type: isText ? 'text' : 'other',
        })
      }
    }
  }
  return out
}
