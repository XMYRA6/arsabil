/**
 * Ilce fiyat verisi — TEK kaynak.
 *
 * Rakamlar INSANDAN gelir; burada uretilmis/tahmini deger BULUNMAZ. Bu
 * sayilar dogrudan fizibilite motorunu suruyor ve bu projede daha once
 * "uydurma veri gercek gibi gorundu" sinifindan iki bug yasandi.
 *
 * Guncelleme: yalnizca asagidaki diziyi duzenleyin, sonra
 * `npm run db:seed:district-prices` calistirin. Seed UPSERT yapar ve
 * hicbir satiri SILMEZ — admin panelinden yapilmis duzeltmeler korunur.
 */
export type IlceFiyatKaydi = {
    il: string
    ilce: string
    /** Ortalama satis fiyati, TL/m² */
    avgSalesPricePerM2: number
    /** Ortalama birim insaat maliyeti, TL/m² */
    avgUnitConstructionPrice: number
}

export const ILCE_FIYATLARI: IlceFiyatKaydi[] = []
