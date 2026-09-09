// Akif-2 — Realtime tool çağrısını backend'e köprüler, modele geri beslenecek mesajları üretir. Saf.
import type { ToolResultCard } from '@/lib/ai/akif/contract'

export interface ToolBridgeResult {
  card: ToolResultCard | null
  outputForModel: string
}

export async function runVoiceToolCall(
  ev: { callId: string; name: string; args: unknown },
  deps: { sessionId: string; fetchFn?: typeof fetch },
): Promise<ToolBridgeResult> {
  const fetchFn = deps.fetchFn ?? fetch
  try {
    const res = await fetchFn('/api/akif/voice/tool', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: deps.sessionId, toolName: ev.name, args: ev.args }),
    })
    if (!res.ok) {
      return { card: null, outputForModel: JSON.stringify({ error: 'tool_unavailable' }) }
    }
    const data = (await res.json()) as Record<string, unknown>
    if (data && typeof data.kind === 'string') {
      return { card: data as unknown as ToolResultCard, outputForModel: JSON.stringify(data) }
    }
    // invalid_args veya beklenmeyen şekil — modele olduğu gibi taşı
    return { card: null, outputForModel: JSON.stringify(data) }
  } catch {
    return { card: null, outputForModel: JSON.stringify({ error: 'tool_unavailable' }) }
  }
}

export function buildFunctionCallOutputMessages(callId: string, output: string): unknown[] {
  return [
    {
      type: 'conversation.item.create',
      item: { type: 'function_call_output', call_id: callId, output },
    },
    { type: 'response.create' },
  ]
}
