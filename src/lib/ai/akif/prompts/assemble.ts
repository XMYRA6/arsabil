import { PERSONA_PROMPT } from './persona'
import { DOMAIN_PROMPT } from './domain'
import { CONVERSATION_POLICY_PROMPT } from './conversationPolicy'
import { TOOL_POLICY_PROMPT } from './toolPolicy'
import { SAFETY_POLICY_PROMPT } from './safetyPolicy'
import { DIALECT_PROMPT } from './dialect'
import { HUMOR_PROMPT } from './humor'

export interface PromptContext {
  hasHistory: boolean
}

const SEPARATOR = '\n\n---\n\n'

const FIRST_MESSAGE_NOTE =
  'Bu konuşmanın ilk mesajı — kullanıcıyı kısaca selamla, sonra yardım et.'

const LAYERS: readonly string[] = [
  PERSONA_PROMPT,
  DOMAIN_PROMPT,
  CONVERSATION_POLICY_PROMPT,
  TOOL_POLICY_PROMPT,
  SAFETY_POLICY_PROMPT,
  DIALECT_PROMPT,
  HUMOR_PROMPT,
]

/**
 * 7 katmanlı sistem-prompt'u sabit sırayla birleştirir. Deterministik:
 * aynı ctx her zaman aynı string'i üretir.
 */
export function assembleSystemPrompt(ctx: PromptContext): string {
  const parts = LAYERS.map((layer) => layer.trim())
  if (!ctx.hasHistory) {
    parts.push(FIRST_MESSAGE_NOTE)
  }
  return parts.join(SEPARATOR)
}
