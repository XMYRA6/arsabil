/** @jest-environment jsdom */
import { readFileSync } from 'fs'
import { join } from 'path'
import { render, screen } from '@testing-library/react'
import { TabBar } from '@/components/layout/TabBar'
import { DataCard, CardList } from '@/components/mobile/DataCard'
import { SegmentedTabs } from '@/components/mobile/SegmentedTabs'
import { ListingCard } from '@/components/marketplace/ListingCard'
import { IlanKarti } from '@/app/profile/[userId]/IlanKarti'
import { Button } from '../Button'
import { Chip } from '../Chip'
import { SegmentedControl } from '../SegmentedControl'
import { Input } from '../Input'

jest.mock('next/link', () => ({
    __esModule: true,
    default: ({ href, children, ...r }: { href: string; children: React.ReactNode }) => <a href={href} {...r}>{children}</a>,
}))
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }))

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8')

describe('basma geri bildirimi (data-press)', () => {
    it('TabBar links have data-press', () => {
        render(<TabBar activeHref="/" tabs={[
            { href: '/', label: 'Ana', icon: <svg /> },
            { href: '/x', label: 'X', icon: <svg /> },
        ]} />)
        const links = screen.getAllByRole('link')
        expect(links).toHaveLength(2)
        links.forEach((a) => expect(a).toHaveAttribute('data-press', ''))
    })

    it('DataCard link has data-press when href is given and not otherwise', () => {
        const { container, rerender } = render(<CardList><DataCard title="A" href="/a" /></CardList>)
        expect(container.querySelector('a')).toHaveAttribute('data-press', '')
        rerender(<CardList><DataCard title="A" /></CardList>)
        expect(container.querySelector('[data-press]')).toBeNull()
    })

    it('SegmentedTabs tabs have data-press', () => {
        render(<SegmentedTabs ariaLabel="g" value="a" onChange={() => {}} options={[{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }]} />)
        screen.getAllByRole('tab').forEach((t) => expect(t).toHaveAttribute('data-press', ''))
    })

    it('ListingCard link has data-press', () => {
        render(<ListingCard listing={{ id: '1', title: 'Arsa', type: 'SALE' }} />)
        expect(screen.getByRole('link', { name: 'Arsa' })).toHaveAttribute('data-press', '')
    })

    it('IlanKarti link has data-press', () => {
        render(<IlanKarti id="1" baslik="B" price={10} />)
        expect(screen.getByRole('link')).toHaveAttribute('data-press', '')
    })

    it('Button, Chip and SegmentedControl options do NOT have data-press (kendi basma geri bildirimleri var)', () => {
        const { container } = render(
            <div>
                <Button>B</Button>
                <Chip>C</Chip>
                <SegmentedControl ariaLabel="z" items={[{ value: 'a', label: 'A' }]} value="a" onChange={() => {}} />
            </div>,
        )
        expect(container.querySelector('[data-press]')).toBeNull()
    })

    it('Input does not have data-press', () => {
        const { container } = render(<Input label="L" />)
        expect(container.querySelector('[data-press]')).toBeNull()
    })
})

describe('basma geri bildirimi CSS', () => {
    it('global geçiş specificity 0 (:where) ile tanımlı', () => {
        expect(read('src/app/globals.css')).toMatch(/:where\(\[data-press\]\)\s*\{[^}]*transition:\s*transform var\(--dur-press\)/)
    })
    it('TabBar .tab geçişi transform içerir', () => {
        expect(read('src/components/layout/TabBar.module.css')).toMatch(/\.tab\s*\{[^}]*transition:[^;}]*transform var\(--dur-press\) var\(--ease-out\)/)
    })
    it('SegmentedTabs .tab geçişi transform içerir', () => {
        expect(read('src/components/mobile/SegmentedTabs.module.css')).toMatch(/\.tab\s*\{[^}]*transition:[^;}]*transform var\(--dur-press\) var\(--ease-out\)/)
    })
    it('ListingCard basılı durumu hover kaldırmasını yener ve reduced-motion kapatır', () => {
        const css = read('src/components/marketplace/ListingCard.module.css')
        expect(css).toMatch(/\.cardRoot\[data-press\]:active\s*\{[^}]*transform:\s*scale\(0\.97\)/)
        const rm = css.slice(css.indexOf('prefers-reduced-motion'))
        expect(rm).toMatch(/\.cardRoot\[data-press\]:active/)
    })
})
