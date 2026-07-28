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

    it('measureRisk hic sonuclanmazsa 6 sn icinde bos snapshot doner (ilan kaydi 24 sn beklemez)', async () => {
        jest.useFakeTimers()
        try {
            // measureRisk asla resolve/reject olmayan bir promise dondurur —
            // gercek dunyada 3 ardisik WMS timeout'unun (~24 sn) simulasyonu.
            measureRiskMock.mockReturnValue(new Promise(() => {}))

            const promise = buildRiskSnapshot(41, 29)
            let settled: unknown
            promise.then(v => { settled = v })

            await jest.advanceTimersByTimeAsync(5999)
            expect(settled).toBeUndefined()

            await jest.advanceTimersByTimeAsync(1)
            const s = await promise
            expect(s).toEqual({ faultDistanceM: null, floodQ100: null, riskSnapshotAt: null })
        } finally {
            jest.useRealTimers()
        }
    })
})
