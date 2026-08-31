// Akif-1 Tool Gateway — explainTerm.
// Kullanıcıya bir imar/arsa teriminin SABİT sözlükten sade Türkçe tanımını verir.
// LLM'in terminoloji uydurmasını engeller. Saf modül: yan etki yok.

import type { TermCard } from '../contract'
import { GLOSSARY, type AkifTerm } from './glossary'

export function explainTerm(args: { term: AkifTerm }): TermCard {
  const entry = GLOSSARY[args.term]
  // Savunmacı: toolRegistry allowlist zaten bilinmeyen terimi engeller.
  if (!entry) {
    throw new Error(`explainTerm: bilinmeyen terim "${String(args.term)}"`)
  }
  return {
    kind: 'term',
    term: args.term,
    shortDef: entry.shortDef,
    example: entry.example,
  }
}
