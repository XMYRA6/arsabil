import { bboxAround, metersPerPixel, nearestOpaquePixelPx, isCenterOpaque, ALPHA_THRESHOLD } from './sampling'
import type { RGBAImage } from './types'

/** Belirtilen piksellere verilen alpha'yı basan tek renkli test görüntüsü. */
function img(size: number, pixels: Array<[number, number, number]>): RGBAImage {
    const data = new Uint8Array(size * size * 4)
    for (const [x, y, a] of pixels) {
        const i = (y * size + x) * 4
        data[i] = 255; data[i + 1] = 0; data[i + 2] = 0; data[i + 3] = a
    }
    return { width: size, height: size, data }
}

describe('metersPerPixel', () => {
    it('kutu KENARINI piksele boler, yaricapi degil', () => {
        // 2 km yaricap => 4 km kenar => 256 px => 15.625 m/px
        expect(metersPerPixel(2000, 256)).toBeCloseTo(15.625, 3)
        expect(metersPerPixel(25000, 256)).toBeCloseTo(195.3125, 3)
    })
})

describe('bboxAround', () => {
    it('enlem yaricapini 111320 m/derece ile hesaplar', () => {
        const b = bboxAround(40, 29, 111320)
        expect(b.maxLat - 40).toBeCloseTo(1, 4)
    })

    it('boylam yaricapini enlem daralmasiyla duzeltir', () => {
        // 60 derecede cos=0.5 => boylam acikligi enlemin iki kati olmali
        const b = bboxAround(60, 29, 111320)
        expect(b.maxLon - 29).toBeCloseTo(2, 3)
    })
})

describe('nearestOpaquePixelPx', () => {
    it('opak piksel yoksa null doner', () => {
        expect(nearestOpaquePixelPx(img(8, []))).toBeNull()
    })

    it('alpha esigin ALTINDAKI pikselleri saymaz (AA sacagi tuzagi)', () => {
        expect(nearestOpaquePixelPx(img(8, [[0, 0, 24]]))).toBeNull()
        expect(nearestOpaquePixelPx(img(8, [[0, 0, ALPHA_THRESHOLD]]))).toBeNull()
    })

    it('esigin USTUNDEKI en yakin pikselin merkeze uzakligini px olarak doner', () => {
        // 9x9 -> merkez (4,4). (4,6) iki piksel asagida.
        expect(nearestOpaquePixelPx(img(9, [[4, 6, 200]]))!).toBeCloseTo(2, 5)
    })

    it('birden fazla isabette EN YAKINI secer', () => {
        expect(nearestOpaquePixelPx(img(9, [[4, 8, 200], [4, 5, 200]]))!).toBeCloseTo(1, 5)
    })
})

describe('cift boyutlu goruntude merkez tanimi', () => {
    // Uretimde fay karolari 256 px (CIFT). nearestOpaquePixelPx kesirli
    // geometrik merkezi ((w-1)/2 = 127.5), isCenterOpaque ise tam sayi
    // merkezi (Math.floor -> 127) kullanir. Bu fark KASITLI: mesafe olcumu
    // alt piksel dogruluk ister, "icinde mi" testi ise tek bir gercek piksel
    // okumak zorundadir. Asagidaki testler bu davranisi cift boyutta sabitler
    // ki ileride biri ikisini "tutarli olsun diye" esitlemeye kalkmasin.
    it('nearestOpaquePixelPx cift boyutta kesirli merkezi kullanir', () => {
        // 4x4 -> merkez (1.5, 1.5). (1,1) pikseli hypot(0.5,0.5) uzaklikta.
        expect(nearestOpaquePixelPx(img(4, [[1, 1, 200]]))!).toBeCloseTo(Math.SQRT1_2, 5)
    })

    it('isCenterOpaque cift boyutta floor edilmis merkez pikseli okur', () => {
        // 4x4 -> floor((4-1)/2) = 1, yani (1,1).
        expect(isCenterOpaque(img(4, [[1, 1, 200]]))).toBe(true)
        expect(isCenterOpaque(img(4, [[2, 2, 200]]))).toBe(false)
    })
})

describe('isCenterOpaque', () => {
    it('merkez piksel esigin ustundeyse true', () => {
        expect(isCenterOpaque(img(9, [[4, 4, 200]]))).toBe(true)
    })

    it('merkez piksel esigin altindaysa false', () => {
        expect(isCenterOpaque(img(9, [[4, 4, 10]]))).toBe(false)
    })
})
