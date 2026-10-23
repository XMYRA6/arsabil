/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import OfflinePage from './page'

describe('/offline page', () => {
    it('çevrimdışı uyarısını (assertive alert) ve yeniden dene düğmesini render eder', () => {
        render(<OfflinePage />)

        expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'assertive')
        expect(screen.getByRole('heading', { name: 'Çevrimdışısınız' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Yeniden dene' })).toBeInTheDocument()
    })
})
