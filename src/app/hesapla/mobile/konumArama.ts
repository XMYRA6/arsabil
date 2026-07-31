/**
 * Konum aramasi — Turkce-duyarli eslestirme.
 *
 * Neden ozel bir normalizasyon: kullanici klavyesinde Turkce harf olmadan
 * yazar ("kadikoy"), veri ise tam yazimla durur ("Kadıköy"). Duz
 * `toLowerCase()` yetmez; noktali-I tuzagi da var (bkz. testler).
 */

const HARF_ESLEME: Record<string, string> = {
    ı: 'i', İ: 'i', ş: 's', Ş: 's', ğ: 'g', Ğ: 'g',
    ü: 'u', Ü: 'u', ö: 'o', Ö: 'o', ç: 'c', Ç: 'c',
}

export function trNormalize(metin: string): string {
    return metin
        .trim()
        .replace(/[ıİşŞğĞüÜöÖçÇ]/g, h => HARF_ESLEME[h])
        .toLowerCase()
}

export function konumAra<T extends { il: string; ilce: string }>(
    kayitlar: T[],
    sorgu: string,
    sinir = 60,
): { sonuclar: T[]; kesildi: boolean } {
    const q = trNormalize(sorgu)
    const eslesenler = q
        ? kayitlar.filter(k => trNormalize(`${k.il} ${k.ilce}`).includes(q))
        : kayitlar
    return {
        sonuclar: eslesenler.slice(0, sinir),
        kesildi: eslesenler.length > sinir,
    }
}
