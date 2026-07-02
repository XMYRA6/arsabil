/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { StickyActionBar } from '../StickyActionBar'

describe('StickyActionBar', () => {
    it('çocukları render eder', () => {
        render(<StickyActionBar><button>Hesapla</button></StickyActionBar>)
        expect(screen.getByRole('button', { name: 'Hesapla' })).toBeInTheDocument()
    })

    it('varsayılanda aboveNav sınıfı yok', () => {
        const { container } = render(<StickyActionBar><span>x</span></StickyActionBar>)
        expect((container.firstChild as HTMLElement).className).not.toContain('aboveNav')
    })

    it('aboveBottomNav ile aboveNav sınıfı eklenir', () => {
        const { container } = render(<StickyActionBar aboveBottomNav><span>x</span></StickyActionBar>)
        expect((container.firstChild as HTMLElement).className).toContain('aboveNav')
    })
})
