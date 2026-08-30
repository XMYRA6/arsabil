/**
 * Ortak il/ilçe/mahalle adı normalizasyonu. Hem yazma yolu (aggregate.ts —
 * crawler'ın cleanTrName'inden geçmiş MarketListing) hem okuma yolu (card.ts —
 * ham TKGM ilAd/ilceAd/mahalleAd) bunu kullanır. TKGM bazı parseller için
 * ASCII-katlanmış ad döndürüyor ("Muratli"), portal "Muratlı" yazıyor;
 * tr-upper i/İ ile ı/I'yı ıraksatıyor. i/ı'yı tek ASCII forma katlayıp
 * locale-invariant büyütüyoruz.
 */
export function normalizeAreaName(s: string): string {
  return s
    .trim()
    .replace(/İ/g, 'I')
    .replace(/ı/g, 'i')
    .toUpperCase()
}
