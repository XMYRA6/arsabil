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
        case 'varsayilan':
            return `Varsayılan ${bicimli}`
        default: {
            // Tuketilmislik kontrolu (whole-branch review M4): onceki surumde
            // `varsayilan` `default`la karsilaniyordu, yani dorduncu bir `tur`
            // eklense SESSIZCE "Varsayılan" basardi. Artik tsc derlemede
            // yakalar.
            const _tuketilmedi: never = kaynak
            return _tuketilmedi
        }
    }
}

/**
 * Il + ilce ciftinden kaydi bulur.
 *
 * Ikisini de PARAMETRE olarak alir; cagiranin state'inden okumaz. Mobil
 * secici il ve ilceyi ayni anda veriyor ve React setState senkron olmadigi
 * icin, `setSelectedIl(il)` sonrasi ayni handler icinde `selectedIl` hala
 * ESKI degeri tasir. Arama o eski il ile yapilirsa eslesme bulunamaz ve
 * fiyatlar sessizce guncellenmez (whole-branch review sonrasi tasarim
 * karari, bkz. 2026-08-01 spec).
 */
export function ilceKaydiBul<T extends { il: string; ilce: string }>(
    kayitlar: T[],
    il: string,
    ilce: string,
): T | undefined {
    return kayitlar.find(k => k.il === il && k.ilce === ilce)
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
 * Metrekare degistiginde ilce piyasa fiyatinin yeniden hesaplanip
 * hesaplanmayacagina karar verir. `null` = DOKUNMA.
 *
 * Whole-branch review I2: `page.tsx`teki effect bunu kosulsuz yapiyordu, yani
 * elle yazilmis bir toplami sessizce eziyordu. Ilce SECIMI ezmeye devam eder
 * (bkz. `ilceSecildi` — ongorulebilirlik tercihi) ve bunu toast'la soyler;
 * metrekare degisimi ise bir konum eylemi degil, o yuzden elle girilmis deger
 * korunur. Sessizce ezmek ile sessizce korumak arasindaki fark: ilki
 * kullanicinin verisini yok eder, ikincisi etmez.
 */
export function metrekareDegisti(
    entry: IlceFiyatGirdisi | undefined,
    apartmentSize: number,
    piyasaFiyatiElle: boolean,
): string | null {
    if (!entry || piyasaFiyatiElle) return null
    return trFormat.format(Math.round(entry.avgSalesPricePerM2 * apartmentSize))
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
