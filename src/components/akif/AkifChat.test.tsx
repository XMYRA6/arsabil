/** @jest-environment jsdom */
import { render, screen, fireEvent, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import type { AkifTurn } from '@/lib/ai/akif/contract'
import { AkifChat, type AkifChatEntry } from './AkifChat'

const baseTurn: AkifTurn = {
  intent: 'collect_info',
  speech: 'Müteahhit payını da söyler misin?',
  state: 'NEUTRAL',
  facts_used: [],
  assumptions: [],
  missing_fields: ['müteahhit payı'],
  risk_level: 'low',
}

it('boş transkript → tanıtım + örnek çip', () => {
  const onSend = jest.fn()
  render(<AkifChat entries={[]} pending={false} onSend={onSend} />)
  expect(screen.getByText(/Ne öğrenmek istersin/)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /emsal nedir/i }))
  expect(onSend).toHaveBeenCalledWith('emsal nedir?')
})

it('kullanıcı + akif balonları + eksik alan barı', () => {
  const entries: AkifChatEntry[] = [
    { id: '1', role: 'user', content: '900 m² arsam var' },
    { id: '2', role: 'akif', turn: baseTurn },
  ]
  render(<AkifChat entries={entries} pending={false} onSend={jest.fn()} />)
  expect(screen.getByText('900 m² arsam var')).toBeInTheDocument()
  expect(screen.getByText('Müteahhit payını da söyler misin?')).toBeInTheDocument()
  expect(screen.getByText('müteahhit payı')).toBeInTheDocument()
})

it('besteci: metin gönderince onSend + temizlenir', () => {
  const onSend = jest.fn()
  render(<AkifChat entries={[]} pending={false} onSend={onSend} />)
  const ta = screen.getByRole('textbox')
  fireEvent.change(ta, { target: { value: '  merhaba  ' } })
  fireEvent.submit(ta.closest('form')!)
  expect(onSend).toHaveBeenCalledWith('merhaba')
  expect((ta as HTMLTextAreaElement).value).toBe('')
})

it('boş mesaj gönderilmez', () => {
  const onSend = jest.fn()
  render(<AkifChat entries={[]} pending={false} onSend={onSend} />)
  fireEvent.submit(screen.getByRole('textbox').closest('form')!)
  expect(onSend).not.toHaveBeenCalled()
})

it('pending → düşünüyor + input disabled', () => {
  render(<AkifChat entries={[{ id: '1', role: 'user', content: 'x' }]} pending onSend={jest.fn()} />)
  expect(screen.getByText(/Akif düşünüyor/)).toBeInTheDocument()
  expect(screen.getByRole('textbox')).toBeDisabled()
})

it('needs_confirmation → Evet/Hayır düğmeleri onSend çağırır', () => {
  const onSend = jest.fn()
  const turn: AkifTurn = {
    ...baseTurn,
    intent: 'clarify_number',
    needs_confirmation: { field: 'emsal', heard: '15', question: 'Emsali 15 mi dedin, 1,5 mi?' },
  }
  render(<AkifChat entries={[{ id: '2', role: 'akif', turn }]} pending={false} onSend={onSend} />)
  expect(screen.getByText(/Emsali 15 mi/)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Evet' }))
  expect(onSend).toHaveBeenCalledWith('Evet')
})

it('scenario tool_result → tablo render', () => {
  const turn: AkifTurn = {
    ...baseTurn,
    intent: 'compare_contractor',
    speech: 'İşte iki senaryo.',
    tool_result: {
      kind: 'contractor_offers',
      rows: [
        { label: 'Müteahhit %50', arsaPayiX: 0.5, arsaSahibiDaireSayisi: 6, arsaSahibiDegeriTL: 12000000, daireSatisFiyatiTL: 2000000 },
      ],
      defaultsUsed: [],
      assumptions: [],
      emsalNote: 'Emsal alanı = 900 × 1,5 = 1.350 m².',
    },
  }
  render(<AkifChat entries={[{ id: '3', role: 'akif', turn }]} pending={false} onSend={jest.fn()} />)
  expect(screen.getByText(/Müteahhit Payı Senaryoları/)).toBeInTheDocument()
  expect(screen.getByText('Müteahhit %50')).toBeInTheDocument()
})

it('term tool_result → terim kutusu', () => {
  const turn: AkifTurn = {
    ...baseTurn,
    intent: 'explain_term',
    speech: 'Emsal şudur.',
    tool_result: { kind: 'term', term: 'emsal', shortDef: 'Toplam inşaat alanı katsayısı.', example: '1000 m² × 2 = 2000 m².' },
  }
  render(<AkifChat entries={[{ id: '4', role: 'akif', turn }]} pending={false} onSend={jest.fn()} />)
  expect(screen.getByText(/Toplam inşaat alanı katsayısı/)).toBeInTheDocument()
  expect(screen.getByText(/1000 m² × 2/)).toBeInTheDocument()
})

it('error entry → hata metni', () => {
  render(<AkifChat entries={[{ id: 'e', role: 'error', content: 'Bağlantı hatası' }]} pending={false} onSend={jest.fn()} />)
  expect(screen.getByText('Bağlantı hatası')).toBeInTheDocument()
})

describe('mobil klavye inset', () => {
  const ORIGINAL_INNER_HEIGHT = window.innerHeight
  class FakeVV extends EventTarget {
    height: number
    offsetTop = 0
    constructor(h: number) {
      super()
      this.height = h
    }
    resizeTo(h: number) {
      this.height = h
      this.dispatchEvent(new Event('resize'))
    }
  }
  let vv: FakeVV
  beforeEach(() => {
    Object.defineProperty(window, 'innerHeight', { value: 844, configurable: true })
    vv = new FakeVV(844)
    Object.defineProperty(window, 'visualViewport', { value: vv, configurable: true })
  })
  afterEach(() => {
    Object.defineProperty(window, 'innerHeight', { value: ORIGINAL_INNER_HEIGHT, configurable: true })
  })

  it('klavye kapalıyken --keyboard-inset 0px', () => {
    const { container } = render(<AkifChat entries={[]} pending={false} onSend={jest.fn()} />)
    const wrap = container.firstChild as HTMLElement
    expect(wrap.style.getPropertyValue('--keyboard-inset')).toBe('0px')
  })

  it('klavye açılınca --keyboard-inset güncellenir', () => {
    const { container } = render(<AkifChat entries={[]} pending={false} onSend={jest.fn()} />)
    const wrap = container.firstChild as HTMLElement
    act(() => {
      vv.resizeTo(844 - 300)
    })
    expect(wrap.style.getPropertyValue('--keyboard-inset')).toBe('300px')
  })
})

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

describe('Task 10 · sohbet alanı', () => {
  beforeEach(() => mockReducedMotion(false))

  it('boş durumda kısa tanıtım cümlesi', () => {
    render(<AkifChat entries={[]} pending={false} onSend={jest.fn()} />)
    expect(screen.getByTestId('akif-intro-text')).toBeInTheDocument()
    expect(screen.getAllByRole('button').filter((b) => b.className.includes('example'))).toHaveLength(3)
  })

  it('balonlarda giriş animasyonu sınıfı var', () => {
    render(<AkifChat entries={[{ id: '1', role: 'user', content: 'selam' }]} pending={false} onSend={jest.fn()} />)
    expect(screen.getByText('selam').className).toMatch(/enter/)
  })

  it('reduced-motion açıkken giriş animasyonu sınıfı yok', () => {
    mockReducedMotion(true)
    render(<AkifChat entries={[{ id: '1', role: 'user', content: 'selam' }]} pending={false} onSend={jest.fn()} />)
    expect(screen.getByText('selam').className).not.toMatch(/enter/)
  })

  it('mikrofon onVoice çağırır', () => {
    const onVoice = jest.fn()
    render(<AkifChat entries={[]} pending={false} onSend={jest.fn()} onVoice={onVoice} />)
    fireEvent.click(screen.getByRole('button', { name: /sesli giriş/i }))
    expect(onVoice).toHaveBeenCalled()
  })

  it('gönder düğmesi boşken ve pending iken devre dışı', () => {
    const { rerender } = render(<AkifChat entries={[]} pending={false} onSend={jest.fn()} />)
    expect(screen.getByRole('button', { name: 'Gönder' })).toBeDisabled()
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'x' } })
    expect(screen.getByRole('button', { name: 'Gönder' })).toBeEnabled()
    rerender(<AkifChat entries={[]} pending onSend={jest.fn()} />)
    expect(screen.getByRole('button', { name: 'Gönder' })).toBeDisabled()
  })

  it('initialDraft doldurur, odaklar, göndermez', () => {
    const onSend = jest.fn()
    render(<AkifChat entries={[]} pending={false} onSend={onSend} initialDraft="emsal nedir" />)
    const ta = screen.getByRole('textbox') as HTMLTextAreaElement
    expect(ta.value).toBe('emsal nedir')
    expect(ta).toHaveFocus()
    expect(onSend).not.toHaveBeenCalled()
  })

  it('Enter gönderir, Shift+Enter göndermez', () => {
    const onSend = jest.fn()
    render(<AkifChat entries={[]} pending={false} onSend={onSend} />)
    const ta = screen.getByRole('textbox')
    fireEvent.change(ta, { target: { value: 'a' } })
    fireEvent.keyDown(ta, { key: 'Enter', shiftKey: true })
    expect(onSend).not.toHaveBeenCalled()
    fireEvent.keyDown(ta, { key: 'Enter' })
    expect(onSend).toHaveBeenCalledWith('a')
  })
})

describe('tool_result türüne göre kart (çökme koruması)', () => {
  const turnWith = (tool_result: unknown): AkifChatEntry[] => [
    { id: 't', role: 'akif', turn: { ...baseTurn, speech: 'Tamam.', tool_result: tool_result as AkifTurn['tool_result'] } },
  ]
  const renderIt = (tr: unknown) =>
    render(<AkifChat entries={turnWith(tr)} pending={false} onSend={jest.fn()} />)

  it('parcel resolved → konum, ada/parsel, alan, fiyat', () => {
    renderIt({
      kind: 'parcel',
      status: 'resolved',
      dto: {
        parcel: { il: 'Ankara', ilce: 'Çankaya', mahalle: 'Oran', ada: '12', parsel: '5', areaSqm: 900, geometry: { type: 'Polygon', coordinates: [] } },
        risk: { faultDistanceM: null, floodQ100: null, status: 'ok' },
        value: { tier: 'member', insufficientData: false, pricePerSqm: { mahalle: 25000 } },
        neighborhood: { geojson: null },
        comparables: { count: 0 },
        demographicsAvailable: false,
      },
    })
    expect(screen.getByText(/Oran, Çankaya\/Ankara/)).toBeInTheDocument()
    expect(screen.getByText(/12 ada, 5 parsel/)).toBeInTheDocument()
    expect(screen.getByText(/900/)).toBeInTheDocument()
    expect(screen.getByText(/25\.000/)).toBeInTheDocument()
  })

  it('chat renders parcel_compare card', () => {
    renderIt({ kind: 'parcel_compare', tier: 'member', rows: [{ label: 'Oran 12/5', status: 'parcel_unavailable' }] })
    expect(screen.getByText('Oran 12/5')).toBeInTheDocument()
    expect(screen.getByText('Veri şu an alınamadı')).toBeInTheDocument()
  })

  it('parcel resolved ama dto yok → çökmez', () => {
    expect(() => renderIt({ kind: 'parcel', status: 'resolved' })).not.toThrow()
  })

  it.each(['location_not_found', 'parcel_not_found', 'parcel_unavailable'])('parcel %s → sade cümle', (status) => {
    renderIt({ kind: 'parcel', status })
    expect(screen.getByTestId('akif-parcel-note')).toBeInTheDocument()
  })

  it('parcel ambiguous → adaylar', () => {
    renderIt({ kind: 'parcel', status: 'ambiguous', candidates: ['Oran, Çankaya', 'Oran, Sincan'] })
    expect(screen.getByText('Oran, Sincan')).toBeInTheDocument()
  })

  it('parcel ambiguous adaysız → çökmez', () => {
    expect(() => renderIt({ kind: 'parcel', status: 'ambiguous' })).not.toThrow()
  })

  it.each(['found', 'summary', 'created', 'updated', 'fact_saved', 'needs_signup', 'not_found', 'rate_limited', 'failed', 'price_estimate', 'price_unavailable', 'calculated'])(
    'project %s → tek satır başlık, data yok ve bozuk data çökmez',
    (op) => {
      const { unmount } = renderIt({ kind: 'project', op })
      expect(screen.getByTestId('akif-project-title')).toBeInTheDocument()
      unmount()
      expect(() => renderIt({ kind: 'project', op, data: { name: 5, items: 'x', nested: { a: null } } })).not.toThrow()
    },
  )

  it('project data.name varsa gösterilir', () => {
    renderIt({ kind: 'project', op: 'created', data: { name: 'Bodrum Arsa' } })
    expect(screen.getByText(/Bodrum Arsa/)).toBeInTheDocument()
  })

  it('bilinmeyen kind → hiçbir şey çizmez, çökmez', () => {
    const { container } = renderIt({ kind: 'alien', rows: 3 })
    expect(screen.getByText('Tamam.')).toBeInTheDocument()
    expect(container.querySelector('table')).toBeNull()
  })

  it('scenario kind ama rows yok → çökmez', () => {
    expect(() => renderIt({ kind: 'contractor_offers' })).not.toThrow()
  })
})
