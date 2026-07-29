/** @jest-environment jsdom */
const mockPathname = jest.fn()
jest.mock('next/navigation', () => ({ usePathname: () => mockPathname() }))
jest.mock('next-auth/react', () => ({ useSession: () => ({ status: 'unauthenticated' }) }))
jest.mock('next/link', () => ({
    __esModule: true,
    default: ({ href, children, ...r }: { href: string; children: React.ReactNode }) =>
        <a href={href} {...r}>{children}</a>,
}))

import { render, screen } from '@testing-library/react'
import { BottomNavbar, BOTTOMNAV_HIDDEN_PATHS } from './BottomNavbar'

beforeEach(() => { mockPathname.mockReturnValue('/marketplace') })

describe('BottomNavbar', () => {
    it('bes sekme, tasarimdaki sirayla', () => {
        render(<BottomNavbar />)
        const links = screen.getAllByRole('link')
        expect(links.map(a => a.textContent)).toEqual(
            ['Pazar', 'Raporlar', 'Ana sayfa', 'Mesajlar', 'Profil'],
        )
    })

    it('ortadaki sekme Ana sayfa; FAB kaldirildi', () => {
        render(<BottomNavbar />)
        const links = screen.getAllByRole('link')
        expect(links[2]).toHaveAttribute('href', '/')
        // "Hesapla" artik alt cubukta degil.
        expect(screen.queryByText('Hesapla')).toBeNull()
    })

    it('aktif sekme aria-current tasir', () => {
        render(<BottomNavbar />)
        expect(screen.getByRole('link', { name: 'Pazar' })).toHaveAttribute('aria-current', 'page')
        expect(screen.getByRole('link', { name: 'Profil' })).not.toHaveAttribute('aria-current')
    })

    it.each(BOTTOMNAV_HIDDEN_PATHS)('%s yolunda hic render edilmez', (path) => {
        mockPathname.mockReturnValue(path)
        const { container } = render(<BottomNavbar />)
        expect(container).toBeEmptyDOMElement()
    })

    it('sohbet ve wizard alt yollarinda da gizlenir', () => {
        for (const p of ['/inbox/abc123', '/listings/new']) {
            mockPathname.mockReturnValue(p)
            const { container } = render(<BottomNavbar />)
            expect(container).toBeEmptyDOMElement()
        }
    })
})
