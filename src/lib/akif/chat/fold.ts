const TR_FOLD: Record<string, string> = {
  'İ': 'i', 'I': 'i', 'ı': 'i',
  'Ş': 's', 'ş': 's',
  'Ğ': 'g', 'ğ': 'g',
  'Ü': 'u', 'ü': 'u',
  'Ö': 'o', 'ö': 'o',
  'Ç': 'c', 'ç': 'c',
};

/** Arama için Türkçe katlama: küçük harf, aksansız, kırpılmış. Slug üretmez. */
export function foldTr(input: string): string {
  const mapped = Array.from(input, (ch) => TR_FOLD[ch] ?? ch).join('');
  return mapped
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}
