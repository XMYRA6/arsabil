/** @jest-environment jsdom */
import { act, render, screen } from '@testing-library/react'
import { DioramaStage } from './DioramaStage'
import type { SceneValue } from '@/lib/dioramas/scene'

const villaGunduz: SceneValue = { tur: 'villa', varyant: 'modern', egim: 'duz', zaman: 'gunduz' }
const villaGece: SceneValue = { ...villaGunduz, zaman: 'gece' }

function mockReducedMotion(reduce: boolean) {
  window.matchMedia = ((q: string) => ({
    matches: reduce && q.includes('prefers-reduced-motion'),
    media: q,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    onchange: null,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}
const layer = (name: string) => document.querySelectorAll(`[data-layer="${name}"]`)

beforeEach(() => mockReducedMotion(false))

describe('DioramaStage · temel', () => {
  it('poster görseli çözülen sahneyi gösterir, kök data nitelikleri', () => {
    render(<DioramaStage scene={villaGunduz} weather="gunesli" />)
    const root = screen.getByTestId('diorama-stage')
    expect(root).toHaveAttribute('data-scene-id', 'villa_modern_duz_gunduz')
    expect(root).toHaveAttribute('data-weather', 'gunesli')
    expect(root).toHaveAttribute('data-motion', 'on')
    const img = screen.getByRole('img', { name: /Villa · Modern/ })
    expect(img.getAttribute('src')).toBe('/dioramas/villa_modern_duz_gunduz-1600.webp')
  })
  it('className kökte', () => {
    render(<DioramaStage scene={villaGunduz} weather="gunesli" className="ek" />)
    expect(screen.getByTestId('diorama-stage').className).toMatch(/ek/)
  })
})

describe('DioramaStage · katmanlar (hareket açık)', () => {
  it('gündüz + güneşli: ağaçlar sallanır (4), bulut gölgesi, su parıltısı; lamba yok; kanvas yok', () => {
    render(<DioramaStage scene={villaGunduz} weather="gunesli" />)
    expect(layer('sway')).toHaveLength(4)
    expect(layer('cloud')).toHaveLength(1)
    expect(layer('glint').length).toBeGreaterThan(5)
    expect(layer('lamp')).toHaveLength(0)
    expect(layer('particles')).toHaveLength(0)
  })
  it('gece: lambalar var, bulut gölgesi ve su parıltısı yok', () => {
    render(<DioramaStage scene={villaGece} weather="gunesli" />)
    expect(layer('lamp').length).toBeGreaterThan(5)
    expect(layer('cloud')).toHaveLength(0)
    expect(layer('glint')).toHaveLength(0)
  })
  it('yağmurlu: ıslak varyant görseli + parçacık kanvası; su parıltısı kapanır', () => {
    render(<DioramaStage scene={villaGunduz} weather="yagmurlu" />)
    const v = layer('weather-variant')
    expect(v).toHaveLength(1)
    expect(v[0].getAttribute('src')).toBe('/dioramas/weather/villa_modern_duz_gunduz-wet.webp')
    expect(layer('particles')).toHaveLength(1)
    expect(layer('glint')).toHaveLength(0)
  })
  it('karlı: kar varyantı + kanvas', () => {
    render(<DioramaStage scene={villaGunduz} weather="karli" />)
    expect(layer('weather-variant')[0].getAttribute('src')).toBe('/dioramas/weather/villa_modern_duz_gunduz-snow.webp')
    expect(layer('particles')).toHaveLength(1)
  })
  it('bulutlu: varyant ve kanvas yok, bulut gölgesi var', () => {
    render(<DioramaStage scene={villaGunduz} weather="bulutlu" />)
    expect(layer('weather-variant')).toHaveLength(0)
    expect(layer('particles')).toHaveLength(0)
    expect(layer('cloud')).toHaveLength(1)
  })
  it('tarla: ürün dalgası (karda yok)', () => {
    const tarla: SceneValue = { tur: 'tarla', varyant: 'bugday', egim: 'duz', zaman: 'gunduz' }
    const { rerender } = render(<DioramaStage scene={tarla} weather="gunesli" />)
    expect(layer('crop-wave')).toHaveLength(1)
    rerender(<DioramaStage scene={tarla} weather="karli" />)
    expect(layer('crop-wave')).toHaveLength(0)
  })
  it('verisi olmayan sahne (yamaç) çökmez: yalnız poster ve bulut', () => {
    const yamac: SceneValue = { ...villaGunduz, egim: 'yamac' }
    render(<DioramaStage scene={yamac} weather="yagmurlu" />)
    expect(layer('sway')).toHaveLength(0)
    expect(layer('weather-variant')).toHaveLength(0)
    expect(screen.getByTestId('diorama-stage')).toHaveAttribute('data-scene-id', 'villa_modern_yamac_gunduz')
  })
})

describe('DioramaStage · hareketi azalt', () => {
  it('prefers-reduced-motion: hiçbir animasyon katmanı ve kanvas yok, data-motion=off', () => {
    mockReducedMotion(true)
    render(<DioramaStage scene={villaGunduz} weather="yagmurlu" />)
    expect(screen.getByTestId('diorama-stage')).toHaveAttribute('data-motion', 'off')
    for (const l of ['sway', 'cloud', 'glint', 'lamp', 'particles', 'crop-wave']) expect(layer(l)).toHaveLength(0)
    // statik ıslak varyant yine gösterilir (hareket değil, durum)
    expect(layer('weather-variant')).toHaveLength(1)
  })
  it('motion="off" prop\'u aynı sonucu verir', () => {
    render(<DioramaStage scene={villaGunduz} weather="karli" motion="off" />)
    expect(screen.getByTestId('diorama-stage')).toHaveAttribute('data-motion', 'off')
    expect(layer('particles')).toHaveLength(0)
  })
})

describe('DioramaStage · dayanıklılık', () => {
  it('canvas getContext null dönse (jsdom) bile çökmez', () => {
    expect(() => render(<DioramaStage scene={villaGunduz} weather="karli" />)).not.toThrow()
  })
  it('hava değişince yeniden render edilebilir', () => {
    const { rerender } = render(<DioramaStage scene={villaGunduz} weather="gunesli" />)
    rerender(<DioramaStage scene={villaGunduz} weather="yagmurlu" />)
    expect(layer('particles')).toHaveLength(1)
    rerender(<DioramaStage scene={villaGunduz} weather="gunesli" />)
    expect(layer('particles')).toHaveLength(0)
  })
})

describe('DioramaStage · yumuşak geçişler', () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  it('sahne değişince eski sahne hayalet olarak kalır, süre dolunca kalkar', () => {
    const { rerender } = render(<DioramaStage scene={villaGunduz} weather="gunesli" />)
    expect(layer('ghost')).toHaveLength(0)
    rerender(<DioramaStage scene={villaGece} weather="gunesli" />)
    expect(layer('ghost')).toHaveLength(1)
    // geçiş sırasında efekt katmanları kapalı (eski/yeni sahne oranı farklı olabilir)
    expect(layer('lamp')).toHaveLength(0)
    act(() => { jest.advanceTimersByTime(800) })
    expect(layer('ghost')).toHaveLength(0)
    expect(layer('lamp').length).toBeGreaterThan(0)
  })

  it('azaltılmış harekette hayalet katman yok', () => {
    mockReducedMotion(true)
    const { rerender } = render(<DioramaStage scene={villaGunduz} weather="gunesli" />)
    rerender(<DioramaStage scene={villaGece} weather="gunesli" />)
    expect(layer('ghost')).toHaveLength(0)
  })

  it('hava varyantı kalkınca katman sönerek çıkar, süre sonunda kaldırılır', () => {
    const { rerender } = render(<DioramaStage scene={villaGunduz} weather="yagmurlu" />)
    act(() => { jest.advanceTimersByTime(100) })
    expect(layer('weather-variant')).toHaveLength(1)
    rerender(<DioramaStage scene={villaGunduz} weather="gunesli" />)
    expect(layer('weather-variant')).toHaveLength(1)
    expect(layer('weather-variant')[0]).not.toHaveAttribute('data-on')
    act(() => { jest.advanceTimersByTime(1100) })
    expect(layer('weather-variant')).toHaveLength(0)
  })
})
