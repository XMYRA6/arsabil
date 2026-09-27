/**
 * 81 il: TKGM/idariYapi'nin döndürdüğü görünen ad (tkgmName, geocode eşleşmesi
 * ve CrawlRun/MarketListing scope'u için) + Emlakjet arama URL'lerinde
 * kullanılan ASCII slug (emlakjetSlug). Slug elle yazılmadı — tkgmName'den
 * deterministik bir Türkçe-ASCII katlama fonksiyonuyla türetildi, testle kilitli.
 */

const TR_ASCII_MAP: Record<string, string> = {
  ı: 'i',
  ğ: 'g',
  ü: 'u',
  ş: 's',
  ö: 'o',
  ç: 'c',
}

export function foldTrToAscii(name: string): string {
  const lower = name.toLocaleLowerCase('tr-TR')
  let out = ''
  for (const ch of lower) out += TR_ASCII_MAP[ch] ?? ch
  return out.replace(/\s+/g, '-')
}

const IL_ADLARI: string[] = [
  'Adana', 'Adıyaman', 'Afyonkarahisar', 'Ağrı', 'Amasya', 'Ankara', 'Antalya',
  'Artvin', 'Aydın', 'Balıkesir', 'Bilecik', 'Bingöl', 'Bitlis', 'Bolu',
  'Burdur', 'Bursa', 'Çanakkale', 'Çankırı', 'Çorum', 'Denizli', 'Diyarbakır',
  'Edirne', 'Elazığ', 'Erzincan', 'Erzurum', 'Eskişehir', 'Gaziantep',
  'Giresun', 'Gümüşhane', 'Hakkari', 'Hatay', 'Isparta', 'Mersin', 'İstanbul',
  'İzmir', 'Kars', 'Kastamonu', 'Kayseri', 'Kırklareli', 'Kırşehir', 'Kocaeli',
  'Konya', 'Kütahya', 'Malatya', 'Manisa', 'Kahramanmaraş', 'Mardin', 'Muğla',
  'Muş', 'Nevşehir', 'Niğde', 'Ordu', 'Rize', 'Sakarya', 'Samsun', 'Siirt',
  'Sinop', 'Sivas', 'Tekirdağ', 'Tokat', 'Trabzon', 'Tunceli', 'Şanlıurfa',
  'Uşak', 'Van', 'Yozgat', 'Zonguldak', 'Aksaray', 'Bayburt', 'Karaman',
  'Kırıkkale', 'Batman', 'Şırnak', 'Bartın', 'Ardahan', 'Iğdır', 'Yalova',
  'Karabük', 'Kilis', 'Osmaniye', 'Düzce',
]

export interface Province {
  tkgmName: string
  emlakjetSlug: string
}

export const PROVINCES: Province[] = IL_ADLARI.map((tkgmName) => ({
  tkgmName,
  emlakjetSlug: foldTrToAscii(tkgmName),
}))
