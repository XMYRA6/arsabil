import { buildSavedReportHero, buildSavedReportRows, SavedReportInput } from '../savedReportContent'

// Kayitli bir Report DB kaydinin GERCEKTEN sahip oldugu alanlar disinda
// hicbir sey yok: risk/iksa/marketPrice/CalculationOutput bu kayitta hic
// persist edilmiyor (bkz. task-9-report.md). Bu test, SavedReportDocument'in
// bastigi TEK icerik kaynagi olan bu iki fonksiyonun, olmayan alanlara dair
// HICBIR satir/etiket uretmedigini garanti eder — spec K6 kararinin butun
// amaci bu.
const RAPOR: SavedReportInput = {
    title: 'Kadıköy Fizibilite',
    totalApartments: 12,
    apartmentSizeSqm: 120,
    luxLevelModifier: 1.2,
    landShareRatio: 0.35,
    minApartmentPrice: 8_964_000,
    landCost: 3_000_000,
}

// Motor ciktisina / bu kayitta hic saklanmayan girdilere ait terimler.
// Bunlardan HICBIRI uretilen etiket/degerlerde gorunmemeli.
const OMITTED_TERMS = [
    'risk', 'iksa', 'piyasa', 'market', 'müteahhit', 'muteahhit',
    'mi_base', 'fd_total', 'fd_per_m2', 'sdx', 'fabirim', 'toplam maliyet',
]

describe('SavedReportDocument icerik uretimi', () => {
    it('yalnizca Report kaydinin sakladigi 7 alani basar (baska hicbir satir yok)', () => {
        const hero = buildSavedReportHero(RAPOR)
        const rows = buildSavedReportRows(RAPOR)

        expect(hero.map(h => h.label)).toEqual(['Daire Fiyatı', 'Arsa Değeri'])
        expect(rows.map(r => r.label)).toEqual([
            'Rapor Adı',
            'Daire Sayısı',
            'Daire Alanı',
            'Arsa Payı',
            'Kalite Katsayısı',
        ])
    })

    // Whole-branch review M5: `x${input.luxLevelModifier}` ham basiliyordu,
    // yani tr-TR bir belgede `x1.2` (nokta ondalik) cikiyordu. Projenin global
    // kisiti sayilari `Intl.NumberFormat('tr-TR')` ile bicimlemek.
    it('kalite katsayisini tr-TR ondalik ayraciyla basar', () => {
        const rows = buildSavedReportRows(RAPOR)
        const kalite = rows.find(r => r.label === 'Kalite Katsayısı')!
        expect(kalite.value).toBe('x1,2')
        expect(kalite.value).not.toContain('.')
    })

    it('tam sayi katsayida gereksiz ondalik basmaz', () => {
        const rows = buildSavedReportRows({ ...RAPOR, luxLevelModifier: 1 })
        expect(rows.find(r => r.label === 'Kalite Katsayısı')!.value).toBe('x1')
    })

    it('motor ciktilarina veya saklanmayan girdilere dair hicbir terim icermez', () => {
        const tumIcerik = [...buildSavedReportHero(RAPOR), ...buildSavedReportRows(RAPOR)]
        const metin = JSON.stringify(tumIcerik).toLowerCase()

        for (const terim of OMITTED_TERMS) {
            expect(metin).not.toContain(terim)
        }
    })
})
