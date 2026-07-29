/** @jest-environment jsdom */
import { render } from '@testing-library/react'
import * as Icons from './index'

const NAMES = [
    'IconBox', 'IconFile', 'IconHome', 'IconMessage', 'IconUser',
    'IconCalculator', 'IconPin', 'IconSettings', 'IconChevronRight',
    'IconCheckCircle', 'IconHeart', 'IconHeartFilled', 'IconEdit',
    'IconMap', 'IconChart', 'IconMoney', 'IconRuler', 'IconFlame',
] as const

describe('ikon seti', () => {
    it.each(NAMES)('%s cizgi ikon sozlesmesine uyar', (name) => {
        const Icon = Icons[name] as React.ComponentType<Icons.IconProps>
        const { container } = render(<Icon />)
        const svg = container.querySelector('svg')!
        expect(svg).toBeInTheDocument()
        expect(svg.getAttribute('viewBox')).toBe('0 0 24 24')
        expect(svg.getAttribute('stroke')).toBe('currentColor')
        expect(svg.getAttribute('fill')).toBe('none')
        expect(svg.getAttribute('stroke-linecap')).toBe('round')
        expect(svg.getAttribute('stroke-linejoin')).toBe('round')
    })

    it('size prop u genislik ve yukseklige uygulanir', () => {
        const { container } = render(<Icons.IconHome size={19} />)
        const svg = container.querySelector('svg')!
        expect(svg.getAttribute('width')).toBe('19')
        expect(svg.getAttribute('height')).toBe('19')
    })

    it('strokeWidth override edilebilir (aktif sekme 2.4 kullanir)', () => {
        const { container } = render(<Icons.IconHome strokeWidth={2.4} />)
        expect(container.querySelector('svg')!.getAttribute('stroke-width')).toBe('2.4')
    })

    it('varsayilan stroke-width 2', () => {
        const { container } = render(<Icons.IconHome />)
        expect(container.querySelector('svg')!.getAttribute('stroke-width')).toBe('2')
    })

    it('className disari gecirilir', () => {
        const { container } = render(<Icons.IconHome className="x" />)
        expect(container.querySelector('svg')!.getAttribute('class')).toBe('x')
    })
})
