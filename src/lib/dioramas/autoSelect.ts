import { SceneValue, Tur, Egim, Zaman } from './scene'

export interface AutoSelectInput {
  nitelik?: string | null
  slopePercent?: number | null
  treeCoverPercent?: number | null
  hasBuilding?: boolean
  theme?: 'light' | 'dark'
  hour?: number
}

function normalizeText(text: string): string {
  let s = text.toLocaleLowerCase('tr-TR')
  const map: Record<string, string> = {
    ı: 'i',
    ş: 's',
    ğ: 'g',
    ü: 'u',
    ö: 'o',
    ç: 'c',
    İ: 'i',
  }
  for (const [from, to] of Object.entries(map)) {
    s = s.split(from).join(to)
  }
  return s
}

export function autoSelectScene(input: AutoSelectInput): SceneValue {
  const nitelik = input.nitelik || ''
  const text = normalizeText(nitelik)

  let tur: Tur = 'arsa'

  if (/\btarla\b/.test(text)) {
    tur = 'tarla'
  } else if (/\bbag\b|\bbahce|\bzeytin|\bfindik/.test(text)) {
    tur = 'bag'
  } else if (/\b(ticari|ticaret|isyeri|dukkan|is merkezi)\b/.test(text)) {
    tur = 'ticari'
  } else if (/\b(apartman|bina|kat karsiligi)\b/.test(text)) {
    tur = 'kat'
  } else if (/\b(mesken|konut|villa|ev)\b/.test(text)) {
    tur = 'villa'
  } else if (/\barsa\b/.test(text)) {
    tur = 'arsa'
  }

  if (tur === 'arsa' && input.hasBuilding) {
    tur = 'villa'
  }

  let varyant = ''
  if (tur === 'arsa') {
    varyant = (input.treeCoverPercent ?? 0) >= 15 ? 'agacli' : 'agacsiz'
  } else if (tur === 'bag') {
    if (/\bzeytin/.test(text)) {
      varyant = 'zeytin'
    } else if (/\bfindik/.test(text)) {
      varyant = 'findik'
    } else {
      varyant = 'asma'
    }
  } else if (tur === 'tarla') {
    varyant = 'bugday'
  } else if (tur === 'villa') {
    varyant = 'modern'
  } else if (tur === 'ticari') {
    varyant = 'ofis'
  } else if (tur === 'kat') {
    varyant = 'bitmis'
  }

  let egim: Egim = 'duz'
  if (tur === 'ticari' || tur === 'kat') {
    egim = 'duz'
  } else {
    const slope = input.slopePercent ?? 0
    if (slope >= 10) {
      egim = 'yamac'
    } else {
      egim = 'duz'
    }
  }

  let zaman: Zaman = 'gunduz'
  if (input.theme) {
    zaman = input.theme === 'dark' ? 'gece' : 'gunduz'
  } else if (input.hour !== undefined) {
    const h = input.hour
    if (h >= 19 || h < 6) {
      zaman = 'gece'
    } else {
      zaman = 'gunduz'
    }
  } else {
    zaman = 'gunduz'
  }

  return { tur, varyant, egim, zaman }
}
