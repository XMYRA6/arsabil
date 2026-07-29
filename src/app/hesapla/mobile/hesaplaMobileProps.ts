/**
 * `page.tsx` state'ini mobil sonuc kartinin prop'larina ceviren saf yardimcilar.
 *
 * Bu katman ayri bir dosyada yasiyor cunku `page.tsx` icinde gomulu haldeyken
 * hic testi yoktu ve iki gercek hata uretti: yuvarlanmamis motor ciktisi
 * (kartta ondalikli TL) ve beraberlikte "%0 PAHALI" rozeti.
 */

/**
 * Sonuc kartina gidecek sayisal deger.
 *
 * Yuvarlar; olcusuz/anlamsiz her durumu `null` yapar. Kart `null` icin "—"
 * basar — "0" DEGIL, cunku sifir ile "sonuc yok" ayni sey degildir.
 */
export function sonucDegeri(n: number | null | undefined): number | null {
    if (n === null || n === undefined || !Number.isFinite(n)) {
        return null
    }
    const yuvarlanmis = Math.round(n)
    // engine_v2.ts:93 `FD_per_m2` icin daire alani 0 iken 0 doner; bu bir
    // hesap sonucu degil, hesaplanamamis olmanin isaretidir.
    return yuvarlanmis === 0 ? null : yuvarlanmis
}

/**
 * Piyasa fiyatina gore fark yuzdesi. `null` -> rozet HIC render edilmez.
 *
 * Beraberlikte ve yuvarlanınca sifira dusen kucuk farklarda rozet
 * gosterilmez: "%0 PAHALI" para hakkinda yanlis bir iddiadir ve mevcut
 * masaustu davranisi da (`HesapOzetiSeridi.tsx:28-29`) kesin esitsizlik
 * kullanip beraberlikte hicbir sey gostermez.
 *
 * `Math.round(-0.4)` `-0` verir ve `-0 < 0` FALSE'tur; `=== 0` karsilastirmasi
 * `-0`'i da yakaladigi icin naif guard'in kacirdigi durum burada kapanir.
 */
export function piyasaFarkiYuzdesi(
    fdTotal: number | null | undefined,
    piyasaFiyati: number,
): number | null {
    if (fdTotal === null || fdTotal === undefined || !Number.isFinite(fdTotal)) {
        return null
    }
    if (!Number.isFinite(piyasaFiyati) || piyasaFiyati <= 0) {
        return null
    }
    const fark = Math.round(((fdTotal - piyasaFiyati) / piyasaFiyati) * 100)
    return fark === 0 ? null : fark
}
