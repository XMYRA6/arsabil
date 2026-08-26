/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { MobileState, mobileStateTransition } from './MobileState'

describe('MobileState', () => {
    it('empty varyantini varsayilan metin ve cizgi ikonla render eder', () => {
        render(<MobileState variant="empty" />)

        expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite')
        expect(screen.getByRole('heading', { name: 'Henüz kayıt yok' })).toBeInTheDocument()
        expect(screen.getByText('İlk kayıt geldiğinde burada görünecek.')).toBeInTheDocument()
        expect(screen.getByTestId('mobile-state-icon')).toHaveAttribute('aria-hidden', 'true')
        expect(screen.getByTestId('mobile-state-icon').querySelector('svg')).toBeInTheDocument()
    })

    it('loading varyantinda progress rolu ve kisa metin kullanir', () => {
        render(<MobileState variant="loading" />)

        expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite')
        expect(screen.getByRole('progressbar', { name: 'Yükleniyor' })).toBeInTheDocument()
        expect(screen.getByRole('heading', { name: 'Yükleniyor' })).toBeInTheDocument()
        expect(screen.getByText('Veriler hazırlanıyor.')).toBeInTheDocument()
    })

    it('error ve offline varyantlari assertive duyuru ve varsayilan Turkce metin kullanir', () => {
        const { rerender } = render(<MobileState variant="error" />)

        expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'assertive')
        expect(screen.getByRole('heading', { name: 'Bir sorun oluştu' })).toBeInTheDocument()
        expect(screen.getByText('Lütfen tekrar deneyin.')).toBeInTheDocument()

        rerender(<MobileState variant="offline" />)
        expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'assertive')
        expect(screen.getByRole('heading', { name: 'Çevrimdışısınız' })).toBeInTheDocument()
        expect(screen.getByText('Bağlantı geri geldiğinde kaldığınız yerden devam edin.')).toBeInTheDocument()
    })

    it('ozel baslik, aciklama, aksiyon ve className alir', () => {
        const action = <button type="button">Tekrar dene</button>
        const { container } = render(
            <MobileState
                variant="error"
                title="Kaydedilemedi"
                description="Bağlantınızı kontrol edin."
                action={action}
                className="customState"
            />,
        )

        expect(screen.getByRole('heading', { name: 'Kaydedilemedi' })).toBeInTheDocument()
        expect(screen.getByText('Bağlantınızı kontrol edin.')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Tekrar dene' })).toBeInTheDocument()
        expect(container.firstElementChild?.className).toContain('customState')
    })

    it('baslik seviyesi ayarlanabilir', () => {
        render(<MobileState variant="empty" title="Boş" headingLevel={3} />)
        expect(screen.getByRole('heading', { level: 3, name: 'Boş' })).toBeInTheDocument()
    })

    describe('mobileStateTransition', () => {
        it('reduced motion acikken sifir sureli gecis doner', () => {
            expect(mobileStateTransition(true)).toEqual({ duration: 0 })
        })

        it('reduced motion kapaliyken kisa fade/slide gecisi doner', () => {
            expect(mobileStateTransition(false)).toEqual({ duration: 0.22, ease: [0.34, 1.56, 0.64, 1] })
        })
    })
})

