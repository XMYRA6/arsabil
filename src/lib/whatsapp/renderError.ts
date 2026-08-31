import type { AreaLevel, AreaOption, ConvFields, ConvLevel } from './types'

const HELP = 'Merhaba! Bir arsanın değerini öğrenmek için konumu ve ada/parsel numarasını yaz. Örnek: `Trabzon Ortahisar Uğurlu 123/45`'

export const renderError = {
  help: () => HELP,
  textOnly: () => 'Şimdilik sadece yazılı mesaj anlayabiliyorum. ' + HELP,
  askFor: (level: ConvLevel, fields: ConvFields): string => {
    switch (level) {
      case 'il': return 'Hangi ildeki arsa?'
      case 'ilce': return `${fields.ilText ?? 'Hangi il'} içinde hangi ilçe?`
      case 'mahalle': return `${fields.ilceText ?? 'Hangi ilçe'} içinde hangi mahalle?`
      case 'ada': return 'Ada numarası nedir?'
      case 'parsel': return 'Parsel numarası nedir?'
    }
  },
  chooseFrom: (level: AreaLevel, candidates: AreaOption[]): string => {
    const label = level === 'il' ? 'İl' : level === 'ilce' ? 'İlçe' : 'Mahalle'
    const list = candidates.map((c, i) => `${i + 1}) ${c.text}`).join('\n')
    return `${label} için birden fazla eşleşme var, hangisi?\n${list}\n(numara veya isim yaz)`
  },
  notFound: (level: AreaLevel, term: string, fields: ConvFields): string => {
    if (level === 'il') return `"${term}" diye bir il bulamadım. Tekrar yazar mısın?`
    if (level === 'ilce') return `${fields.ilText ?? ''} içinde "${term}" diye bir ilçe bulamadım. Tekrar yazar mısın?`
    return `${fields.ilceText ?? ''} içinde "${term}" diye bir mahalle bulamadım. Tekrar yazar mısın?`
  },
  rateLimited: () => 'Çok fazla sorgu geldi, 1 dakika sonra tekrar dener misin?',
  forCardFailure: (reason: 'parcel_not_found' | 'parcel_unavailable'): string =>
    reason === 'parcel_not_found'
      ? 'Bu ada/parsel TKGM\'de bulunamadı. Numaraları kontrol edip tekrar yazar mısın?'
      : 'Tapu servisine şu an ulaşılamıyor, birazdan tekrar dener misin?',
}
