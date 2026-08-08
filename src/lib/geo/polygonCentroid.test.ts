import { polygonCentroid } from './polygonCentroid'

describe('polygonCentroid', () => {
    it('Polygon geometriden kose ortalamasi hesaplar', () => {
        const geometry = { type: 'Polygon', coordinates: [[[35.0, 37.0], [35.2, 37.0], [35.2, 37.2], [35.0, 37.2]]] }
        expect(polygonCentroid(geometry)).toEqual({ lat: 37.1, lng: 35.1 })
    })

    it('MultiPolygon geometrisinde TUM poligonlarin koseleri duzlestirilir', () => {
        const geometry = {
            type: 'MultiPolygon',
            coordinates: [
                [[[0, 0], [2, 0], [2, 2], [0, 2]]],
                [[[10, 10], [12, 10], [12, 12], [10, 12]]],
            ],
        }
        expect(polygonCentroid(geometry)).toEqual({ lat: 6, lng: 6 })
    })

    it('gecersiz/eksik geometride null doner', () => {
        expect(polygonCentroid(null)).toBeNull()
        expect(polygonCentroid(undefined)).toBeNull()
        expect(polygonCentroid({ type: 'Point', coordinates: [1, 2] })).toBeNull()
        expect(polygonCentroid({ type: 'Polygon', coordinates: [] })).toBeNull()
    })
})
