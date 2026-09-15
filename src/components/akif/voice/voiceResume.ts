// Akif-2.1 — yeniden bağlanmada yeni Realtime oturumuna verilecek kompakt bağlam.
// Saf fonksiyon; ek LLM çağrısı yok. İstemcideki transkript + son karttan üretilir.
import type { ToolResultCard } from '@/lib/ai/akif/contract'

export const RESUME_MAX_TURNS = 8

export interface ResumeTranscriptItem {
  role: 'user' | 'akif'
  text: string
  card?: ToolResultCard
}

function cardLine(card: ToolResultCard): string {
  if (card.kind === 'term') {
    return `("${card.term}" terimi açıklandı)`
  }
  if (card.kind === 'parcel') {
    return `(Parsel sorgulandı: ${card.status})`
  }
  const r = card.rows[0]
  if (!r) return `(Son hesap: ${card.kind})`
  const pct = Math.round(r.arsaPayiX * 100)
  const daire = r.arsaSahibiDaireSayisi ?? '?'
  const deger = r.arsaSahibiDegeriTL ?? '?'
  return `(Son hesap: ${card.kind}, ilk satır "${r.label}" — arsa payı %${pct}, sahibine ${daire} daire / ${deger} TL)`
}

export function buildResumeContext(transcript: ResumeTranscriptItem[]): string {
  const turns = transcript
    .filter((it) => it.text.trim().length > 0)
    .slice(-RESUME_MAX_TURNS)
    .map((it) => `${it.role === 'user' ? 'Kullanıcı' : 'Akif'}: ${it.text.trim()}`)

  const lastCard = [...transcript].reverse().find((it) => it.card)?.card

  const lines = ['[Bağlantı koptu ve yeniden kuruldu. Buraya kadarki konuşma:]']
  lines.push(turns.length ? turns.join('\n') : '(henüz konuşma yok)')
  if (lastCard) lines.push(cardLine(lastCard))
  lines.push('[Kaldığın yerden devam et. Kullanıcıya bilgileri baştan sordurma.]')
  return lines.join('\n')
}
