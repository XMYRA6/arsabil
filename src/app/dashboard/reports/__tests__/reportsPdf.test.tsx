/** @jest-environment jsdom */
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RaporPdfButonu } from '../RaporPdfButonu'

const uret = jest.fn()
jest.mock('@/lib/pdf/saved_report_generator', () => ({ generateSavedReportPdf: (...a: unknown[]) => uret(...a) }))

// `RAPOR`, `RaporPdfButonu`nun `rapor` prop'unun turu olan `Rapor`
// (== generateSavedReportPdf'in ilk parametresi, yani SavedReportInput) ile
// uyumlu, GERCEK bir kayitli-rapor sekli: Report DB kaydinin sakladigi 7
// alanin disinda hicbir sey yok (motor ciktilari — risk, iksa, marketPrice,
// CalculationOutput — bu kayitta hic persist edilmiyor, bkz. task-9-report.md).
const RAPOR = {
    title: 'Kadıköy Fizibilite',
    totalApartments: 12,
    apartmentSizeSqm: 120,
    luxLevelModifier: 1.2,
    landShareRatio: 0.35,
    minApartmentPrice: 8_964_000,
    landCost: 3_000_000,
}

describe('RaporPdfButonu', () => {
    beforeEach(() => uret.mockReset())

    it('tiklaninca PDF uretecini rapor verisiyle cagirir', async () => {
        render(<RaporPdfButonu rapor={RAPOR} />)
        await userEvent.click(screen.getByRole('button', { name: /PDF indir/ }))
        expect(uret).toHaveBeenCalledTimes(1)
        expect(uret.mock.calls[0][0]).toMatchObject({ title: 'Kadıköy Fizibilite' })
    })

    it('uretim sirasinda buton devre disi ve durum bildiriliyor', async () => {
        let cozumle: () => void = () => {}
        uret.mockImplementation(() => new Promise<void>(r => { cozumle = r }))
        render(<RaporPdfButonu rapor={RAPOR} />)
        const btn = screen.getByRole('button', { name: /PDF indir/ })
        await userEvent.click(btn)
        expect(screen.getByRole('button', { name: /Hazırlanıyor/ })).toBeDisabled()
        await act(async () => { cozumle() })
    })

    it('hata durumunda buton yeniden kullanilabilir olur', async () => {
        uret.mockRejectedValue(new Error('patladi'))
        render(<RaporPdfButonu rapor={RAPOR} />)
        await userEvent.click(screen.getByRole('button', { name: /PDF indir/ }))
        expect(await screen.findByRole('button', { name: /PDF indir/ })).toBeEnabled()
    })
})
