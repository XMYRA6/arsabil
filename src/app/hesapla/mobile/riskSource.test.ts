import { riskKaynakEtiketi } from './riskSource'

describe('riskKaynakEtiketi', () => {
    it('TKGM kaynaklı riski boyle isaretler', () => {
        expect(riskKaynakEtiketi({ tur: 'tkgm' })).toBe('TKGM Onaylı')
    })

    it('elle girilen riski boyle isaretler', () => {
        expect(riskKaynakEtiketi({ tur: 'elle' })).toBe('Elle girildi')
    })

    it('varsayilan riski boyle isaretler', () => {
        expect(riskKaynakEtiketi({ tur: 'varsayilan' })).toBe('Varsayılan')
    })
})
