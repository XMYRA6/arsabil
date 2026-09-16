/**
 * Türkçe il/ilçe/mahalle display adlarını URL-güvenli slug'a çevirir.
 * `normalizeAreaName`'den (ASCII-katlama, ama sadece İ/I) farklı olarak
 * TÜM Türkçe aksanlı harfleri (ç/ğ/ı/ö/ş/ü) katlar — SEO URL'i için gerekli.
 */
const TR_FOLD: Record<string, string> = {
  ç: 'c', Ç: 'c',
  ğ: 'g', Ğ: 'g',
  ı: 'i', I: 'i', İ: 'i',
  ö: 'o', Ö: 'o',
  ş: 's', Ş: 's',
  ü: 'u', Ü: 'u',
}

export function slugify(input: string): string {
  const folded = input
    .split('')
    .map((ch) => TR_FOLD[ch] ?? ch)
    .join('')
    .toLowerCase()
  return folded
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
