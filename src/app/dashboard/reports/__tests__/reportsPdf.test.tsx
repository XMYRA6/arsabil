/** @jest-environment jsdom */
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RaporPdfButonu } from '../RaporPdfButonu'

const uret = jest.fn()
jest.mock('@/lib/pdf/report_generator', () => ({ generatePdfReport: (...a: unknown[]) => uret(...a) }))

// NOT: `RAPOR`, `RaporPdfButonu`nun `rapor` prop'unun turu olan `Rapor`
// (== generatePdfReport'un ilk parametresi, yani ReportInput) ile UYUMLU
// olmak zorunda. Brief'teki orijinal duz fikstur ({ id, name, fdTotal })
// bu tipi karsilamiyordu (luxLevel/apartmentSize/.../result gibi zorunlu
// alanlar eksikti) — bu yuzden tip gevsetilmedi, fikstur tamamlandi.
const RAPOR = {
    id: 'r1',
    name: 'Kadıköy Fizibilite',
    luxLevel: 1.2,
    apartmentSize: 120,
    landShareRatio: 35,
    totalApartments: 12,
    riskLevel: 5,
    builderProfit: 1.2,
    iksaMode: 'off',
    marketPrice: 0,
    result: {
        Mi_base: 5_000_000,
        Mz: 0,
        Z: 0,
        Mi: 5_000_000,
        Ma: 3_000_000,
        M: 8_000_000,
        FD_total: 8_964_000,
        FD_per_m2: 74_700,
        Sdx: null,
        FA: null,
        FAbirim: null,
    },
}

describe('RaporPdfButonu', () => {
    beforeEach(() => uret.mockReset())

    it('tiklaninca PDF uretecini rapor verisiyle cagirir', async () => {
        render(<RaporPdfButonu rapor={RAPOR} />)
        await userEvent.click(screen.getByRole('button', { name: /PDF indir/ }))
        expect(uret).toHaveBeenCalledTimes(1)
        expect(uret.mock.calls[0][0]).toMatchObject({ name: 'Kadıköy Fizibilite' })
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
