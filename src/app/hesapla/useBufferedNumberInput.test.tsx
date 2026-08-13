/** @jest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react'
import { useBufferedNumberInput } from './useBufferedNumberInput'

function TestWrapper({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
    const { girdi, handleChange } = useBufferedNumberInput(value, onChange)
    return <input type="number" aria-label="test-girdi" value={girdi} onChange={e => handleChange(e.target.value)} />
}

describe('useBufferedNumberInput', () => {
    it('baslangic degerini gosterir', () => {
        render(<TestWrapper value={12000} onChange={jest.fn()} />)
        expect(screen.getByLabelText('test-girdi')).toHaveValue(12000)
    })

    it('null baslangicta bos gorunur', () => {
        render(<TestWrapper value={null} onChange={jest.fn()} />)
        expect(screen.getByLabelText('test-girdi')).toHaveValue(null)
    })

    it('gecerli (>0) deger yazilinca onChange cagrilir', () => {
        const onChange = jest.fn()
        render(<TestWrapper value={12000} onChange={onChange} />)
        fireEvent.change(screen.getByLabelText('test-girdi'), { target: { value: '15500' } })
        expect(onChange).toHaveBeenCalledWith(15500)
    })

    it('alan silindiginde bos kalir, eski degere geri sicramaz', () => {
        const onChange = jest.fn()
        render(<TestWrapper value={12000} onChange={onChange} />)
        fireEvent.change(screen.getByLabelText('test-girdi'), { target: { value: '' } })
        expect(screen.getByLabelText('test-girdi')).toHaveValue(null)
        expect(onChange).not.toHaveBeenCalled()
    })

    it('gecersiz "0" ara degeri commit edilmez ama alanda gorunmeye devam eder', () => {
        const onChange = jest.fn()
        render(<TestWrapper value={12000} onChange={onChange} />)
        fireEvent.change(screen.getByLabelText('test-girdi'), { target: { value: '0' } })
        expect(screen.getByLabelText('test-girdi')).toHaveValue(0)
        expect(onChange).not.toHaveBeenCalled()
    })
})
