/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import { MiniMap } from './MiniMap'

describe('MiniMap risk katmanlari', () => {
    it('riskLayers verilmediginde katman kontrolu gosterilmez', () => {
        render(<MiniMap lat={41} lng={29} />)
        expect(screen.queryByLabelText('Diri fay katmani')).toBeNull()
    })

    it('riskLayers true iken iki katman kontrolu gosterilir', () => {
        render(<MiniMap lat={41} lng={29} riskLayers />)
        expect(screen.getByLabelText('Diri fay katmani')).toBeInTheDocument()
        expect(screen.getByLabelText('Taskin katmani')).toBeInTheDocument()
    })

    it('katman kontrolleri varsayilan olarak kapalidir', () => {
        render(<MiniMap lat={41} lng={29} riskLayers />)
        expect(screen.getByLabelText('Diri fay katmani')).not.toBeChecked()
    })
})
