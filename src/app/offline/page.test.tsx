/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import OfflinePage from './page'

jest.mock('next/link', () => ({
    __esModule: true,
    default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => <a href={href} {...props}>{children}</a>,
}))

describe('/offline page', () => {
    it('MobileState offline varyanti ve ana sayfa aksiyonu render eder', () => {
        render(<OfflinePage />)

        expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'assertive')
        expect(screen.getByRole('heading', { name: 'Çevrimdışısınız' })).toBeInTheDocument()
        expect(screen.getByText('Bağlantı geri geldiğinde kaldığınız yerden devam edin.')).toBeInTheDocument()
        expect(screen.getByRole('link', { name: 'Ana sayfa' })).toHaveAttribute('href', '/')
    })
})

