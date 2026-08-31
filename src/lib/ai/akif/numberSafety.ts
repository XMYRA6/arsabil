/**
 * numberSafety — Türkçe serbest metinden sayı / yüzde / sözlü-sayı çıkarımı ve
 * aralık güvenliği. Saf modül, I/O yok.
 *
 * İki tüketici:
 *  - orchestrator: şüpheli / düşük güvenli sayıları kullanıcıya onaylatır
 *  - toolRegistry: deterministik motoru çağırmadan önce tool argümanlarını doğrular
 *
 * `src/app/hesapla/trNumberFormat.ts` yalnızca formatlama yardımcıları içerir
 * (parse eden bir helper yok), bu yüzden küçük TR parse mantığı burada taşınır
 * — app→lib bağımlılığı kurulmadı.
 */

export interface ExtractedNumber {
  raw: string // metindeki ham ifade
  value: number
  kind: 'plain' | 'percent' | 'area' | 'ratio'
  lowConfidence: boolean // sözlü ("bir virgül elli"), sıra dışı aralık, belirsiz
}

export const RANGES = {
  // Tool-arg doğrulaması: %0 veya %100 müteahhit payı bir kat-karşılığı
  // senaryosu DEĞİLDİR ve x=1'de motor sıfıra bölmeyi kelepçeleyerek
  // ~1000× şişik değer üretir (final review C1). Yüzde 1–99 ile sınırlı.
  percent: { min: 1, max: 99 },
  area: { min: 100, max: 50_000 }, // arsa alanı m²
  emsal: { min: 0.1, max: 5 },
  daire: { min: 30, max: 500 },
  birimMaliyet: { min: 1_000, max: 200_000 }, // TL/m² (final review I7)
} as const

export function validateRange(
  field: 'percent' | 'area' | 'emsal' | 'daire' | 'birimMaliyet',
  value: number,
): boolean {
  const r = RANGES[field]
  return value >= r.min && value <= r.max
}

/**
 * Çıkarılmış bir sayının kind'ine göre kabaca sıra dışı olup olmadığı.
 * `ratio` emsal gibi ele alınır (0.1–5), `area` arsa alanı gibi (min 50).
 */
export function isOutOfRange(kind: ExtractedNumber['kind'], value: number): boolean {
  switch (kind) {
    case 'percent':
      return value < 0 || value > 100
    case 'area':
      return value < 50 || value > 50_000
    case 'ratio':
      return value < 0.1 || value > 5
    case 'plain':
    default:
      return false
  }
}

// --- TR rakamlı sayı parse (nokta = binlik, virgül = ondalık) ---
function parseTRNumber(s: string): number {
  const hasDot = s.includes('.')
  const hasComma = s.includes(',')
  if (hasDot && hasComma) return Number(s.replace(/\./g, '').replace(',', '.'))
  if (hasComma) return Number(s.replace(',', '.'))
  if (hasDot) {
    // 1.500 / 12.000.000 → binlik ayıraç
    if (/^\d{1,3}(\.\d{3})+$/.test(s)) return Number(s.replace(/\./g, ''))
    return Number(s) // tek nokta, binlik kalıbına uymuyor → ondalık
  }
  return Number(s)
}

// --- Sözlü sayı (KABA: 0–9999, "virgül" ondalık ayırıcı) ---
const WORD_VALUE: Record<string, number> = {
  sıfır: 0,
  bir: 1,
  iki: 2,
  üç: 3,
  dört: 4,
  beş: 5,
  altı: 6,
  yedi: 7,
  sekiz: 8,
  dokuz: 9,
  on: 10,
  yirmi: 20,
  otuz: 30,
  kırk: 40,
  elli: 50,
  altmış: 60,
  yetmiş: 70,
  seksen: 80,
  doksan: 90,
}
const NUMBER_WORDS = new Set([...Object.keys(WORD_VALUE), 'yüz', 'bin'])

function parseSpokenInt(words: string[]): number {
  let total = 0
  let current = 0
  for (const w of words) {
    if (w === 'yüz') {
      current = (current === 0 ? 1 : current) * 100
    } else if (w === 'bin') {
      current = (current === 0 ? 1 : current) * 1000
      total += current
      current = 0
    } else if (w in WORD_VALUE) {
      current += WORD_VALUE[w]
    }
  }
  return total + current
}

interface Tok {
  text: string
  lower: string
  start: number
  end: number
}

function tokenize(text: string): Tok[] {
  const re = /\d[\d.,]*\d|\d|m²|m2|%|\p{L}+/gu
  const out: Tok[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    out.push({
      text: m[0],
      lower: m[0].toLowerCase(),
      start: m.index,
      end: m.index + m[0].length,
    })
  }
  return out
}

const AREA_UNITS = new Set(['m²', 'm2', 'metrekare'])

function isDigitTok(t: Tok): boolean {
  return /^\d/.test(t.text)
}

export function extractNumbers(text: string): ExtractedNumber[] {
  const toks = tokenize(text)
  const results: ExtractedNumber[] = []

  for (let i = 0; i < toks.length; i++) {
    const t = toks[i]
    const prev = toks[i - 1]
    const next = toks[i + 1]

    // 1) Rakamlı sayı
    if (isDigitTok(t)) {
      const value = parseTRNumber(t.text)
      if (Number.isNaN(value)) continue

      let kind: ExtractedNumber['kind']
      let raw = t.text
      let end = t.end

      if (next && next.lower === '%') {
        kind = 'percent'
        end = next.end
        raw = text.slice(t.start, end)
        i++ // % tüketildi
      } else if (next && AREA_UNITS.has(next.lower)) {
        kind = 'area'
        end = next.end
        raw = text.slice(t.start, end)
        i++
      } else if (prev && prev.lower === 'yüzde') {
        kind = 'percent'
        raw = text.slice(prev.start, end)
      } else {
        kind = Number.isInteger(value) ? 'plain' : 'ratio'
      }

      results.push({ raw, value, kind, lowConfidence: isOutOfRange(kind, value) })
      continue
    }

    // 2) Sözlü sayı dizisi
    if (NUMBER_WORDS.has(t.lower)) {
      // maksimal dizi topla ("virgül" iç ayıraç olabilir)
      const runIdx: number[] = []
      let j = i
      while (j < toks.length) {
        const w = toks[j].lower
        if (NUMBER_WORDS.has(w)) {
          runIdx.push(j)
          j++
        } else if (
          w === 'virgül' &&
          toks[j + 1] &&
          NUMBER_WORDS.has(toks[j + 1].lower)
        ) {
          runIdx.push(j)
          j++
        } else {
          break
        }
      }

      const runToks = runIdx.map((k) => toks[k])
      const words = runToks.map((rt) => rt.lower)
      const virgulAt = words.indexOf('virgül')

      let value: number
      let kind: ExtractedNumber['kind']

      if (virgulAt >= 0) {
        const intWords = words.slice(0, virgulAt)
        const fracWords = words.slice(virgulAt + 1)
        const intVal = parseSpokenInt(intWords)
        const fracVal = parseSpokenInt(fracWords)
        const digits = String(fracVal).length
        value = intVal + fracVal / 10 ** digits
        kind = 'ratio'
      } else {
        value = parseSpokenInt(words)
        const before = toks[i - 1]
        const after = toks[j]
        if (before && before.lower === 'yüzde') kind = 'percent'
        else if (after && AREA_UNITS.has(after.lower)) kind = 'area'
        else kind = 'plain'
      }

      const startTok = kind === 'percent' && toks[i - 1] ? toks[i - 1] : runToks[0]
      const endTok = runToks[runToks.length - 1]
      results.push({
        raw: text.slice(startTok.start, endTok.end),
        value,
        kind,
        lowConfidence: true, // sözlü → her zaman düşük güven
      })

      i = j - 1
      continue
    }
  }

  return results
}
