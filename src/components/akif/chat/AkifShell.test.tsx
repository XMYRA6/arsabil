/** @jest-environment jsdom */
import { render, screen, fireEvent, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import { AkifShell } from './AkifShell'

function setup(extra: Partial<React.ComponentProps<typeof AkifShell>> = {}) {
  const onTitle = jest.fn()
  const onVoice = jest.fn()
  const utils = render(
    <AkifShell
      title="Akçaabat arsa değeri"
      onTitle={onTitle}
      onVoice={onVoice}
      sidebar={
        <nav aria-label="Sohbetler">
          <button type="button">Yeni sohbet</button>
        </nav>
      }
      panel={<aside aria-label="Çalışma paneli">PANEL</aside>}
      {...extra}
    >
      <div>SOHBET</div>
    </AkifShell>,
  )
  return { onTitle, onVoice, ...utils }
}

describe('AkifShell', () => {
  it('kenar çubuğu, sohbet ve paneli bir kez çizer', () => {
    setup()
    expect(screen.getAllByRole('navigation', { name: 'Sohbetler' })).toHaveLength(1)
    expect(screen.getAllByText('PANEL')).toHaveLength(1)
    expect(screen.getByText('SOHBET')).toBeInTheDocument()
  })

  it('Sesli konuş düğmesi onVoice çağırır (svg ikon, emoji yok)', () => {
    const { onVoice } = setup()
    const btn = screen.getByRole('button', { name: /sesli konuş/i })
    expect(btn.querySelector('svg')).toBeTruthy()
    fireEvent.click(btn)
    expect(onVoice).toHaveBeenCalledTimes(1)
  })

  it('voiceActive iken Sesli konuş düğmesi gizlenir', () => {
    setup({ voiceActive: true })
    expect(screen.queryByRole('button', { name: /sesli konuş/i })).toBeNull()
  })

  it('başlık: tıkla → düzenle → Enter onTitle çağırır', () => {
    const { onTitle } = setup()
    fireEvent.click(screen.getByRole('button', { name: /Akçaabat arsa değeri.*adını değiştir/ }))
    const input = screen.getByRole('textbox', { name: 'Sohbet başlığı' })
    expect(input).toHaveFocus()
    fireEvent.change(input, { target: { value: '  Yeni ad  ' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onTitle).toHaveBeenCalledTimes(1)
    expect(onTitle).toHaveBeenCalledWith('Yeni ad')
    expect(screen.queryByRole('textbox', { name: 'Sohbet başlığı' })).toBeNull()
  })

  it('başlık: Esc iptal eder, ardından blur tekrar kaydetmez', () => {
    const { onTitle } = setup()
    fireEvent.click(screen.getByRole('button', { name: /adını değiştir/ }))
    const input = screen.getByRole('textbox', { name: 'Sohbet başlığı' })
    fireEvent.change(input, { target: { value: 'Başka' } })
    fireEvent.keyDown(input, { key: 'Escape' })
    fireEvent.blur(input)
    expect(onTitle).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /adını değiştir/ })).toHaveFocus()
  })

  it('başlık: blur kaydeder; değişmemiş ya da boş başlık kaydedilmez', () => {
    const { onTitle } = setup()
    fireEvent.click(screen.getByRole('button', { name: /adını değiştir/ }))
    let input = screen.getByRole('textbox', { name: 'Sohbet başlığı' })
    fireEvent.change(input, { target: { value: 'Blur ad' } })
    fireEvent.blur(input)
    expect(onTitle).toHaveBeenCalledWith('Blur ad')

    fireEvent.click(screen.getByRole('button', { name: /adını değiştir/ }))
    input = screen.getByRole('textbox', { name: 'Sohbet başlığı' })
    fireEvent.change(input, { target: { value: '   ' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onTitle).toHaveBeenCalledTimes(1)
  })

  it('menü düğmesi çekmeceyi açar (aria-expanded), Esc kapatır ve odağı menü düğmesine döndürür', () => {
    const { container } = setup()
    const menu = screen.getByRole('button', { name: 'Sohbetleri aç' })
    expect(menu).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(menu)
    expect(menu).toHaveAttribute('aria-expanded', 'true')
    expect(container.querySelector('[data-drawer-open]')).toBeTruthy()
    // odak çekmecenin içine taşınır
    expect(screen.getByRole('button', { name: 'Yeni sohbet' })).toHaveFocus()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(menu).toHaveAttribute('aria-expanded', 'false')
    expect(container.querySelector('[data-drawer-open]')).toBeNull()
    expect(menu).toHaveFocus()
  })

  it('arka plana tıklamak çekmeceyi kapatır', () => {
    const { container } = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Sohbetleri aç' }))
    fireEvent.click(screen.getByTestId('akif-shell-scrim'))
    expect(container.querySelector('[data-drawer-open]')).toBeNull()
  })

  it('closeSignal değişince çekmece kapanır', () => {
    const { container, rerender, onTitle, onVoice } = setup({ closeSignal: 0 })
    fireEvent.click(screen.getByRole('button', { name: 'Sohbetleri aç' }))
    expect(container.querySelector('[data-drawer-open]')).toBeTruthy()
    rerender(
      <AkifShell
        title="x"
        onTitle={onTitle}
        onVoice={onVoice}
        closeSignal={1}
        sidebar={<nav aria-label="Sohbetler" />}
        panel={<aside />}
      >
        <div />
      </AkifShell>,
    )
    expect(container.querySelector('[data-drawer-open]')).toBeNull()
  })

  it('panel düğmesi (900–1280) paneli açar/kapatır, aria-expanded', () => {
    const { container } = setup()
    const t = screen.getByRole('button', { name: 'Çalışma paneli' })
    expect(t).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(t)
    expect(t).toHaveAttribute('aria-expanded', 'true')
    expect(container.querySelector('[data-panel-open]')).toBeTruthy()
    fireEvent.click(t)
    expect(container.querySelector('[data-panel-open]')).toBeNull()
  })

  it('Senaryo çipi alt sayfayı açar; Esc ve Kapat kapatır', () => {
    const { container } = setup()
    const chip = screen.getByRole('button', { name: 'Senaryo' })
    expect(chip).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(chip)
    expect(chip).toHaveAttribute('aria-expanded', 'true')
    expect(container.querySelector('[data-sheet-open]')).toBeTruthy()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(container.querySelector('[data-sheet-open]')).toBeNull()
    expect(chip).toHaveFocus()
    fireEvent.click(chip)
    fireEvent.click(screen.getByRole('button', { name: 'Paneli kapat' }))
    expect(container.querySelector('[data-sheet-open]')).toBeNull()
  })

  it('Esc "Sohbetlerde ara" alanındayken de çekmeceyi kapatır; yeniden adlandırma alanında kapatmaz', () => {
    const { container } = render(
      <AkifShell
        title="t"
        onTitle={() => {}}
        onVoice={() => {}}
        sidebar={
          <nav aria-label="Sohbetler">
            <input type="search" aria-label="Sohbetlerde ara" />
            <input aria-label="Sohbet adı" />
          </nav>
        }
        panel={<aside />}
      >
        <div />
      </AkifShell>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Sohbetleri aç' }))
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Sohbet adı' }), { key: 'Escape' })
    expect(container.querySelector('[data-drawer-open]')).toBeTruthy()
    fireEvent.keyDown(screen.getByRole('searchbox', { name: 'Sohbetlerde ara' }), { key: 'Escape' })
    expect(container.querySelector('[data-drawer-open]')).toBeNull()
  })

  it('genişlik 900px üstüne çıkınca açık çekmece ve alt sayfa kapanır', () => {
    type L = (e: { matches: boolean }) => void
    const listeners: L[] = []
    const original = window.matchMedia
    window.matchMedia = ((q: string) => ({
      matches: false,
      media: q,
      addEventListener: (_: string, fn: L) => listeners.push(fn),
      removeEventListener: (_: string, fn: L) => {
        const i = listeners.indexOf(fn)
        if (i >= 0) listeners.splice(i, 1)
      },
    })) as unknown as typeof window.matchMedia
    try {
      const { container } = setup()
      fireEvent.click(screen.getByRole('button', { name: 'Sohbetleri aç' }))
      expect(container.querySelector('[data-drawer-open]')).toBeTruthy()
      act(() => listeners.slice().forEach((fn) => fn({ matches: true })))
      expect(container.querySelector('[data-drawer-open]')).toBeNull()
      fireEvent.click(screen.getByRole('button', { name: 'Senaryo' }))
      expect(container.querySelector('[data-sheet-open]')).toBeTruthy()
      act(() => listeners.slice().forEach((fn) => fn({ matches: true })))
      expect(container.querySelector('[data-sheet-open]')).toBeNull()
      expect(listeners.length).toBe(0)
    } finally {
      window.matchMedia = original
    }
  })
})
