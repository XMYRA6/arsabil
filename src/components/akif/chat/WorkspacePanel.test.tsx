/** @jest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react'
import { WorkspacePanel } from './WorkspacePanel'
import type { WorkspaceState } from '@/lib/akif/chat/workspace'

const empty: WorkspaceState = {
  konum: null, alanM2: null, m2Fiyat: null, emsalNotu: null,
  arsaSahibiPct: null, muteahhitPct: null, varsayimlar: [], dolu: false,
}
const full: WorkspaceState = {
  konum: 'Yıldızlı, Akçaabat/Trabzon', alanM2: 1250, m2Fiyat: 2450, emsalNotu: 'Emsal notu',
  arsaSahibiPct: 46, muteahhitPct: 54, varsayimlar: ['Kat sayısı 5 varsayıldı'], dolu: true,
}

describe('WorkspacePanel', () => {
  it('bos durumda yonlendirme metni ve gri yer tutucu satirlar gosterir', () => {
    const { container } = render(<WorkspacePanel state={empty} changes={{}} onReport={() => {}} />)
    expect(screen.getByText('Bir arsa söyle, burada değerleri göreceksin')).toBeTruthy()
    expect(container.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThan(0)
    expect(screen.queryByText('Konum')).toBeNull()
  })

  it('aside etiketi ve dolu durum satirlari tr-TR bicimiyle', () => {
    render(<WorkspacePanel state={full} changes={{}} onReport={() => {}} />)
    expect(screen.getByRole('complementary', { name: 'Çalışma paneli' })).toBeTruthy()
    expect(screen.getByText('Konum')).toBeTruthy()
    expect(screen.getByText('Alan')).toBeTruthy()
    expect(screen.getByText('m² fiyatı')).toBeTruthy()
    expect(screen.getByText('1.250 m²')).toBeTruthy()
    expect(screen.getByText('₺2.450')).toBeTruthy()
    expect(screen.getByText('Kat sayısı 5 varsayıldı')).toBeTruthy()
  })

  it('null alan "—" gosterir', () => {
    render(<WorkspacePanel state={{ ...full, alanM2: null, m2Fiyat: null }} changes={{}} onReport={() => {}} />)
    expect(screen.getAllByText('—').length).toBe(2)
  })

  it('pay cubugu amber segment genisligi', () => {
    render(<WorkspacePanel state={full} changes={{}} onReport={() => {}} />)
    expect((screen.getByTestId('pay-arsa') as HTMLElement).style.width).toBe('46%')
    expect(screen.getByText('%46')).toBeTruthy()
    expect(screen.getByText('%54')).toBeTruthy()
  })

  it('pay null ise bos notr cubuk', () => {
    render(<WorkspacePanel state={{ ...full, arsaSahibiPct: null, muteahhitPct: null }} changes={{}} onReport={() => {}} />)
    expect(screen.queryByTestId('pay-arsa')).toBeNull()
  })

  it('degisen pay "%46 → %50" ve data-changed', () => {
    render(
      <WorkspacePanel
        state={{ ...full, arsaSahibiPct: 50, muteahhitPct: 50 }}
        changes={{ arsaSahibiPct: { from: 46, to: 50 }, muteahhitPct: { from: 54, to: 50 } }}
        onReport={() => {}}
      />,
    )
    const t = screen.getByText('%46 → %50')
    expect(t.closest('[data-changed]')).toBeTruthy()
    expect(screen.getByText('%54 → %50')).toBeTruthy()
  })

  it('degisen alan ve fiyat eski → yeni', () => {
    render(
      <WorkspacePanel
        state={full}
        changes={{ alanM2: { from: 900, to: 1250 }, m2Fiyat: { from: 2000, to: 2450 } }}
        onReport={() => {}}
      />,
    )
    expect(screen.getByText('900 m² → 1.250 m²').closest('[data-changed]')).toBeTruthy()
    expect(screen.getByText('₺2.000 → ₺2.450')).toBeTruthy()
  })

  it('Rapor olustur onReport cagirir ve reportDisabled iken devre disi', () => {
    const onReport = jest.fn()
    const { rerender } = render(<WorkspacePanel state={full} changes={{}} onReport={onReport} />)
    fireEvent.click(screen.getByRole('button', { name: 'Rapor oluştur' }))
    expect(onReport).toHaveBeenCalledTimes(1)
    rerender(<WorkspacePanel state={full} changes={{}} onReport={onReport} reportDisabled />)
    expect((screen.getByRole('button', { name: 'Rapor oluştur' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('degerler bolgesi aria-live polite', () => {
    const { container } = render(<WorkspacePanel state={full} changes={{}} onReport={() => {}} />)
    expect(container.querySelector('[aria-live="polite"]')).toBeTruthy()
  })

  it('ayni alan ikinci kez degisince satir yeniden mount olur', () => {
    const st = { ...full, arsaSahibiPct: 50, muteahhitPct: 50 }
    const { rerender } = render(
      <WorkspacePanel state={st} changes={{ arsaSahibiPct: { from: 46, to: 50 } }} onReport={() => {}} />,
    )
    const first = screen.getByText('%46 → %50').closest('[data-changed]')
    rerender(
      <WorkspacePanel
        state={{ ...st, arsaSahibiPct: 55, muteahhitPct: 45 }}
        changes={{ arsaSahibiPct: { from: 50, to: 55 } }}
        onReport={() => {}}
      />,
    )
    const second = screen.getByText('%50 → %55').closest('[data-changed]')
    expect(second).toBeTruthy()
    expect(second).not.toBe(first)
  })

  it('degisen konum eski → yeni gosterir', () => {
    render(
      <WorkspacePanel
        state={full}
        changes={{ konum: { from: 'Ortahisar', to: 'Yıldızlı, Akçaabat/Trabzon' } }}
        onReport={() => {}}
      />,
    )
    expect(screen.getByText('Ortahisar → Yıldızlı, Akçaabat/Trabzon').closest('[data-changed]')).toBeTruthy()
  })

  it('emsalNotu varsa gosterilir, yoksa gosterilmez', () => {
    const { rerender } = render(<WorkspacePanel state={full} changes={{}} onReport={() => {}} />)
    expect(screen.getByText('Emsal notu')).toBeTruthy()
    rerender(<WorkspacePanel state={{ ...full, emsalNotu: null }} changes={{}} onReport={() => {}} />)
    expect(screen.queryByText('Emsal notu')).toBeNull()
  })

  it('bos durumda da aria-live sarmalayicisi vardir', () => {
    const { container } = render(<WorkspacePanel state={empty} changes={{}} onReport={() => {}} />)
    const live = container.querySelector('[aria-live="polite"]')
    expect(live?.textContent).toContain('Bir arsa söyle')
  })
})
