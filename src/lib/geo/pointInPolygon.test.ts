import { pointInPolygon } from './pointInPolygon'

describe('pointInPolygon', () => {
    it('basit bir karenin icindeki nokta icin true doner', () => {
        const square = [[0, 0], [4, 0], [4, 4], [0, 4]]
        expect(pointInPolygon({ lat: 2, lng: 2 }, square)).toBe(true)
    })

    it('basit bir karenin disindaki nokta icin false doner', () => {
        const square = [[0, 0], [4, 0], [4, 4], [0, 4]]
        expect(pointInPolygon({ lat: 10, lng: 10 }, square)).toBe(false)
    })

    it('L-sekilli (disbukey olmayan) bir parselde aritmetik-ortalama centroid cikintinin (notch) DISINA duser — bu duzeltmenin motive ettigi gercek-dunya deseni', () => {
        // Koseler: [lng, lat] ciftleri.
        const lShape = [[0, 0], [3, 0], [3, 1], [1, 1], [1, 3], [0, 3]]
        // Koselerin aritmetik ortalamasi: lng (0+3+3+1+1+0)/6 = 8/6 = 4/3,
        // lat (0+0+1+1+3+3)/6 = 8/6 = 4/3 — bu nokta L'nin kesilmis
        // (cikarilmis) kosesine denk gelir, yani parselin GERCEK govdesinin disinda.
        const centroid = { lat: 4 / 3, lng: 4 / 3 }
        expect(pointInPolygon(centroid, lShape)).toBe(false)

        // L'nin govdesinin icinde acikca kalan bir nokta ise true donmeli.
        const insideBody = { lat: 0.5, lng: 0.5 }
        expect(pointInPolygon(insideBody, lShape)).toBe(true)
    })
})
