const measureRiskMock = jest.fn()
jest.mock('./lookup', () => ({ measureRisk: (...a: unknown[]) => measureRiskMock(...a) }))

import { buildRiskSnapshot } from './riskSnapshot'

describe('buildRiskSnapshot', () => {
    beforeEach(() => { measureRiskMock.mockReset() })

    it('koordinat yoksa TUCBS yi hic cagirmaz ve bos snapshot doner', async () => {
        const s = await buildRiskSnapshot(null, null)
        expect(measureRiskMock).not.toHaveBeenCalled()
        expect(s).toEqual({ faultDistanceM: null, floodQ100: null, riskSnapshotAt: null })
    })

    it('olcum basarisizsa bos snapshot doner (ilan kaydi engellenmez)', async () => {
        measureRiskMock.mockResolvedValue(null)
        const s = await buildRiskSnapshot(41, 29)
        expect(s.riskSnapshotAt).toBeNull()
    })

    it('basarili olcumde alanlari ve zaman damgasini doldurur', async () => {
        measureRiskMock.mockResolvedValue({
            faultDistanceM: 1200, gammaF: 1.2, floodQ100: true, suggestedR: 1.13,
        })
        const s = await buildRiskSnapshot(41, 29)
        expect(s.faultDistanceM).toBe(1200)
        expect(s.floodQ100).toBe(true)
        expect(s.riskSnapshotAt).toBeInstanceOf(Date)
    })
})
