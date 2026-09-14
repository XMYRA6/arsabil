// Akif-2 — Realtime tool çağrısını backend'e köprüler, modele geri beslenecek mesajları üretir. Saf.
import type { ToolResultCard } from '@/lib/ai/akif/contract'

export type PendingActionSignal =
  | { type: 'proposal'; pendingActionId: string; confirmCard: unknown; candidates?: { id: string; name: string }[] }
  | { type: 'committed'; scenarioId: string; projectId: string; projectName: string; undoToken: string; undoUntil: string }
  | { type: 'blocked' | 'error'; message: string }

export interface ToolBridgeResult {
  card: ToolResultCard | null
  outputForModel: string
  pendingAction?: PendingActionSignal
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
    if (data && data.kind === 'pending_action') {
      return { card: null, pendingAction: { type: 'proposal', pendingActionId: data.pendingActionId as string, confirmCard: data.confirmCard }, outputForModel: JSON.stringify(data) }
    }
    if (data && data.kind === 'needs_project_choice') {
      return { card: null, pendingAction: { type: 'proposal', pendingActionId: data.pendingActionId as string, confirmCard: { scenarioName: data.scenarioName, display: data.display, projectRef: { newName: null } }, candidates: data.candidates as { id: string; name: string }[] }, outputForModel: JSON.stringify(data) }
    }
    if (data && data.kind === 'blocked') {
      return { card: null, pendingAction: { type: 'blocked', message: String(data.message ?? '') }, outputForModel: JSON.stringify(data) }
    }
    if (data && data.kind === 'action_committed') {
      return { card: null, pendingAction: { type: 'committed', scenarioId: data.scenarioId as string, projectId: data.projectId as string, projectName: data.projectName as string, undoToken: data.undoToken as string, undoUntil: data.undoUntil as string }, outputForModel: JSON.stringify(data) }
    }
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
