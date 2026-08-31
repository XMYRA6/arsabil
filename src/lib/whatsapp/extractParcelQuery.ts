import type { ParsedQuery } from './types'

const D = '\\d{1,7}'

export function extractParcelQuery(text: string): ParsedQuery {
  const q: ParsedQuery = {}
  let rest = ` ${text} `

  // ada/parsel — "123/45"
  const slash = rest.match(new RegExp(`(?<![\\d])(${D})\\s*[/\\-]\\s*(${D})(?![\\d])`))
  if (slash) {
    q.ada = slash[1]
    q.parsel = slash[2]
    rest = rest.replace(slash[0], ' ')
  }
  // "123 ada" / "ada 123" / "ada: 123"
  const adaWord = rest.match(new RegExp(`(${D})\\s*ada\\b|\\bada\\s*[:.]?\\s*(${D})`, 'i'))
  if (adaWord && !q.ada) {
    q.ada = adaWord[1] ?? adaWord[2]
    rest = rest.replace(adaWord[0], ' ')
  }
  const parselWord = rest.match(new RegExp(`(${D})\\s*parsel\\b|\\bparsel\\s*[:.]?\\s*(${D})`, 'i'))
  if (parselWord && !q.parsel) {
    q.parsel = parselWord[1] ?? parselWord[2]
    rest = rest.replace(parselWord[0], ' ')
  }

  // kalan kelimeler = konum
  const words = rest.trim().split(/\s+/).filter(w => w && !/^\d+$/.test(w))
  if (words[0]) q.ilText = words[0]
  if (words[1]) q.ilceText = words[1]
  if (words.length >= 3) q.mahalleText = words.slice(2).join(' ')

  return q
}
