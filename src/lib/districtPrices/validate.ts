import type { IlceFiyatKaydi } from './data'

export type DogrulamaHatasi = { indeks: number; mesaj: string }

function isimGecerli(s: string): boolean {
    return typeof s === 'string' && s.length > 0 && s === s.trim()
}

function fiyatGecerli(n: number): boolean {
    return Number.isFinite(n) && n > 0
}

/**
 * Veri dosyasini YAZMADAN ONCE dogrular. Bos dizi = gecerli.
 *
 * Yarim yazilmis bir fiyat tablosu, hic yazilmamisindan kotudur: kullanici
 * bazi ilcelerde dogru, bazilarinda sessizce yanlis hesap gorur.
 */
export function dogrulaIlceFiyatlari(kayitlar: IlceFiyatKaydi[]): DogrulamaHatasi[] {
    const hatalar: DogrulamaHatasi[] = []
    const gorulen = new Set<string>()

    kayitlar.forEach((k, indeks) => {
        if (!isimGecerli(k.il)) hatalar.push({ indeks, mesaj: `il adi gecersiz: "${k.il}"` })
        if (!isimGecerli(k.ilce)) hatalar.push({ indeks, mesaj: `ilce adi gecersiz: "${k.ilce}"` })
        if (!fiyatGecerli(k.avgSalesPricePerM2)) {
            hatalar.push({ indeks, mesaj: `avgSalesPricePerM2 pozitif olmali: ${k.avgSalesPricePerM2}` })
        }
        if (!fiyatGecerli(k.avgUnitConstructionPrice)) {
            hatalar.push({ indeks, mesaj: `avgUnitConstructionPrice pozitif olmali: ${k.avgUnitConstructionPrice}` })
        }
        const anahtar = `${k.il} ${k.ilce}`
        if (gorulen.has(anahtar)) {
            hatalar.push({ indeks, mesaj: `tekrar eden kayit: ${k.il} / ${k.ilce}` })
        }
        gorulen.add(anahtar)
    })

    return hatalar
}
