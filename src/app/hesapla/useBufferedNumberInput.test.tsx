/** @jest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react'
import { useBufferedNumberInput } from './useBufferedNumberInput'

function TestWrapper({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
    const { girdi, handleChange } = useBufferedNumberInput(value, onChange)
    return <input type="text" inputMode="decimal" aria-label="test-girdi" value={girdi} onChange={e => handleChange(e.target.value)} />
}

describe('useBufferedNumberInput', () => {
    it('baslangic degeri binlik ayiracla gosterilir', () => {
        render(<TestWrapper value={12000} onChange={jest.fn()} />)
        expect(screen.getByLabelText('test-girdi')).toHaveValue('12.000')
    })

    it('null baslangicta bos gorunur', () => {
        render(<TestWrapper value={null} onChange={jest.fn()} />)
        expect(screen.getByLabelText('test-girdi')).toHaveValue('')
    })

    it('gecerli (>0) deger yazilinca onChange RAKAM olarak cagrilir (ayirac degil)', () => {
        const onChange = jest.fn()
        render(<TestWrapper value={12000} onChange={onChange} />)
        fireEvent.change(screen.getByLabelText('test-girdi'), { target: { value: '15500' } })
        expect(onChange).toHaveBeenCalledWith(15500)
    })

    it('yazarken alanda binlik ayirac canli gorunur', () => {
        const onChange = jest.fn()
        render(<TestWrapper value={12000} onChange={onChange} />)
        fireEvent.change(screen.getByLabelText('test-girdi'), { target: { value: '15500' } })
        expect(screen.getByLabelText('test-girdi')).toHaveValue('15.500')
    })

    it('alan silindiginde bos kalir, eski degere geri sicramaz', () => {
        const onChange = jest.fn()
        render(<TestWrapper value={12000} onChange={onChange} />)
        fireEvent.change(screen.getByLabelText('test-girdi'), { target: { value: '' } })
        expect(screen.getByLabelText('test-girdi')).toHaveValue('')
        expect(onChange).not.toHaveBeenCalled()
    })

    it('gecersiz "0" ara degeri commit edilmez ama alanda gorunmeye devam eder', () => {
        const onChange = jest.fn()
        render(<TestWrapper value={12000} onChange={onChange} />)
        fireEvent.change(screen.getByLabelText('test-girdi'), { target: { value: '0' } })
        expect(screen.getByLabelText('test-girdi')).toHaveValue('0')
        expect(onChange).not.toHaveBeenCalled()
    })

    it('zaten ayiracli bir deger uzerine yeni rakam yazilinca dogru sekilde yeniden gruplanir (idempotent onChange)', () => {
        // Kullanici "12.000" gorunen alanin sonuna "0" ekleyip "12.0000"
        // yazdiginda (tarayicinin gercek DOM value'su budur, controlled
        // input eski formatli metni de tasir) commit edilen ham deger
        // ayirac karakterleri SAYMADAN dogru olmali: 120000.
        const onChange = jest.fn()
        render(<TestWrapper value={12000} onChange={onChange} />)
        fireEvent.change(screen.getByLabelText('test-girdi'), { target: { value: '12.0000' } })
        expect(onChange).toHaveBeenCalledWith(120000)
        expect(screen.getByLabelText('test-girdi')).toHaveValue('120.000')
    })
})
