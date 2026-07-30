/**
 * Birim insaat maliyetinin KAYNAGI ve oncelik kurali.
 *
 * Bu deger motora `P` olarak gider, yani hesabi suren asil sayidir. Onceden
 * hicbir ekrani yoktu ve ilce secilince sessizce degisiyordu; kullanici
 * "hangi fiyattan hesapliyor bilmiyorum" diyordu (spec 1).
 */

const trFormat = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 })

export type BirimMaliyetKaynagi =
    | { tur: 'varsayilan' }
    | { tur: 'ilce'; ilce: string }
    | { tur: 'elle' }

export type IlceFiyatGirdisi = {
    ilce: string
    avgUnitConstructionPrice: number
    avgSalesPricePerM2: number
}

/** Ekranda birim maliyetin altinda gosterilen kaynak metni. */
export function kaynakEtiketi(kaynak: BirimMaliyetKaynagi, deger: number): string {
    const bicimli = `${trFormat.format(deger)} TL/m²`
    switch (kaynak.tur) {
        case 'ilce':
            return `${kaynak.ilce} ortalaması ${bicimli}`
        case 'elle':
            return `Elle girildi · ${bicimli}`
        default:
            return `Varsayılan ${bicimli}`
    }
}

/**
 * Ilce secildiginde IKI deger birden dolar. Elle girilmis bir deger varsa
 * KORUNMAZ: ongorulebilirlik akilliliga tercih edildi (spec 4) — aksi halde
 * kullanici ilceyi degistirip fiyatin neden degismedigini anlayamaz.
 */
export function ilceSecildi(
    entry: IlceFiyatGirdisi,
    apartmentSize: number,
): { birimMaliyet: number; piyasaFiyati: string; kaynak: BirimMaliyetKaynagi } {
    return {
        birimMaliyet: entry.avgUnitConstructionPrice,
        piyasaFiyati: trFormat.format(Math.round(entry.avgSalesPricePerM2 * apartmentSize)),
        kaynak: { tur: 'ilce', ilce: entry.ilce },
    }
}

/**
 * Konum temizlenince yonetici varsayilanina donulur.
 *
 * `orijinalPiyasaFiyati` ikinci parametre: ilce secimi birim maliyet VE
 * piyasa fiyatini birlikte doldurduguna gore (spec 4, bkz. `ilceSecildi`),
 * temizleme de ikisini birden geri almali — yoksa ekran, temizlenmis bir
 * konum icin ESKI ilcenin piyasa fiyatini gostermeye devam eder (canli
 * dogrulamada bulundu, Task 10). Verilmezse bos dizeye doner: konum hic
 * secilmeden temizlenirse geri donulecek bir "orijinal" deger yoktur.
 */
export function konumTemizlendi(
    varsayilanBirimMaliyet: number,
    orijinalPiyasaFiyati: string = '',
): { birimMaliyet: number; piyasaFiyati: string; kaynak: BirimMaliyetKaynagi } {
    return {
        birimMaliyet: varsayilanBirimMaliyet,
        piyasaFiyati: orijinalPiyasaFiyati,
        kaynak: { tur: 'varsayilan' },
    }
}
