/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { SwipeGallery } from '../SwipeGallery'

const IMAGES = ['/uploads/a.jpg', '/uploads/b.jpg', '/uploads/c.jpg']

describe('SwipeGallery', () => {
    it('boş dizi ile hiçbir şey render etmez', () => {
        const { container } = render(<SwipeGallery images={[]} alt="Arsa fotoğrafı" />)
        expect(container).toBeEmptyDOMElement()
    })

    it('tüm görselleri sıra bilgili alt metniyle render eder', () => {
        render(<SwipeGallery images={IMAGES} alt="Arsa fotoğrafı" />)
        expect(screen.getByAltText('Arsa fotoğrafı 1/3')).toBeInTheDocument()
        expect(screen.getByAltText('Arsa fotoğrafı 2/3')).toBeInTheDocument()
        expect(screen.getByAltText('Arsa fotoğrafı 3/3')).toBeInTheDocument()
    })

    it('birden fazla görselde nokta göstergesi, tek görselde yok', () => {
        const { container, rerender } = render(<SwipeGallery images={IMAGES} alt="Foto" />)
        expect(container.querySelectorAll('[data-dot]')).toHaveLength(3)
        rerender(<SwipeGallery images={['/uploads/a.jpg']} alt="Foto" />)
        expect(container.querySelectorAll('[data-dot]')).toHaveLength(0)
    })

    it('ilk görsel eager, sonrakiler lazy yüklenir', () => {
        render(<SwipeGallery images={IMAGES} alt="Foto" />)
        expect(screen.getByAltText('Foto 1/3')).toHaveAttribute('loading', 'eager')
        expect(screen.getByAltText('Foto 2/3')).toHaveAttribute('loading', 'lazy')
    })
})
