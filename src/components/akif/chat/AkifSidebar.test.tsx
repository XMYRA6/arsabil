/** @jest-environment jsdom */
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AkifSidebar } from './AkifSidebar'
import type { ConversationSummary } from '@/lib/akif/chat/conversationStore'
import type { ScenarioItem } from '@/lib/akif/chat/scenarios'

const now = new Date()
const iso = (daysAgo: number) => new Date(now.getTime() - daysAgo * 86_400_000).toISOString()
const conv = (id: string, title: string, d = 0): ConversationSummary => ({ id, title, projectId: null, lastMessageAt: iso(d) })
const scen = (source: 'site' | 'kart', id: string, name: string): ScenarioItem => ({
  key: `${source}:${id}`, source, id, name, summary: 'Akçaabat · 1250 m²', updatedAt: iso(0),
  workspace: { konum: null, alanM2: null, m2Fiyat: null, emsalNotu: null, arsaSahibiPct: null, muteahhitPct: null, varsayimlar: [], dolu: false },
})

function setup(over: Partial<React.ComponentProps<typeof AkifSidebar>> = {}) {
  const props = {
    conversations: [conv('a', 'Akçaabat arsa değeri'), conv('b', 'Emsal nedir?'), conv('c', 'Eski sohbet', 30)],
    scenarios: [scen('site', 's1', 'Proje Bir'), scen('kart', 'k1', 'Kart Bir')],
    activeId: 'a', q: '', onQ: jest.fn(), onNew: jest.fn(), onOpen: jest.fn(), onOpenScenario: jest.fn(),
    onRename: jest.fn(), onDelete: jest.fn(), hasMore: false, onLoadMore: jest.fn(),
    user: { name: 'Test Kullanıcı' }, signedIn: true, ...over,
  }
  render(<AkifSidebar {...props} />)
  return props
}

describe('AkifSidebar', () => {
  it('nav landmark ve Yeni sohbet', async () => {
    const p = setup()
    expect(screen.getByRole('navigation', { name: 'Sohbetler' })).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: /Yeni sohbet/ }))
    expect(p.onNew).toHaveBeenCalled()
  })

  it('arama alanı etiketli, yazınca onQ', async () => {
    const p = setup()
    await userEvent.type(screen.getByLabelText('Sohbetlerde ara'), 'x')
    expect(p.onQ).toHaveBeenCalledWith('x')
  })

  it('senaryolar: kaynak etiketi ve tıklama', async () => {
    const p = setup()
    expect(screen.getByText('Proje')).toBeTruthy()
    expect(screen.getByText('Akif')).toBeTruthy()
    await userEvent.click(screen.getByText('Proje Bir'))
    expect(p.onOpenScenario).toHaveBeenCalledWith(p.scenarios[0])
  })

  it('senaryo yoksa bölüm yok', () => {
    setup({ scenarios: [] })
    expect(screen.queryByText('Senaryolarım')).toBeNull()
  })

  it('yalnız dolu grup başlıkları', () => {
    setup()
    expect(screen.getByText('Bugün')).toBeTruthy()
    expect(screen.getByText('Daha eski')).toBeTruthy()
    expect(screen.queryByText('Dün')).toBeNull()
  })

  it('aktif sohbet aria-current, tıklayınca onOpen', async () => {
    const p = setup()
    const active = screen.getByText('Akçaabat arsa değeri').closest('[aria-current]')
    expect(active?.getAttribute('aria-current')).toBe('true')
    await userEvent.click(screen.getByText('Emsal nedir?'))
    expect(p.onOpen).toHaveBeenCalledWith('b')
  })

  it('uzun başlık title attribute', () => {
    const long = 'Çok uzun bir başlık '.repeat(10).trim()
    setup({ conversations: [conv('z', long)] })
    expect(screen.getByTitle(long)).toBeTruthy()
  })

  it('yeniden adlandır: Enter onRename, Esc iptal', async () => {
    const p = setup()
    await userEvent.click(screen.getAllByRole('button', { name: 'Sohbet işlemleri' })[1])
    await userEvent.click(screen.getByRole('menuitem', { name: 'Yeniden adlandır' }))
    const input = screen.getByLabelText('Sohbet adı')
    await userEvent.clear(input)
    await userEvent.type(input, 'Yeni ad{Enter}')
    expect(p.onRename).toHaveBeenCalledWith('b', 'Yeni ad')

    await userEvent.click(screen.getAllByRole('button', { name: 'Sohbet işlemleri' })[0])
    await userEvent.click(screen.getByRole('menuitem', { name: 'Yeniden adlandır' }))
    await userEvent.type(screen.getByLabelText('Sohbet adı'), 'zzz{Escape}')
    expect(p.onRename).toHaveBeenCalledTimes(1)
    expect(screen.queryByLabelText('Sohbet adı')).toBeNull()
  })

  it('sil: onay sonrası onDelete', async () => {
    const p = setup()
    await userEvent.click(screen.getAllByRole('button', { name: 'Sohbet işlemleri' })[1])
    await userEvent.click(screen.getByRole('menuitem', { name: 'Sil' }))
    expect(p.onDelete).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Evet, sil' }))
    expect(p.onDelete).toHaveBeenCalledWith('b')
  })

  it('sil: vazgeç', async () => {
    const p = setup()
    await userEvent.click(screen.getAllByRole('button', { name: 'Sohbet işlemleri' })[0])
    await userEvent.click(screen.getByRole('menuitem', { name: 'Sil' }))
    await userEvent.click(screen.getByRole('button', { name: 'Vazgeç' }))
    expect(p.onDelete).not.toHaveBeenCalled()
  })

  it('misafir: giriş bandı, liste ve arama yok, senaryolar var', () => {
    setup({ signedIn: false, user: null })
    const link = screen.getByRole('link', { name: /Sohbetlerini kaydetmek için giriş yap/ })
    expect(link.getAttribute('href')).toBe('/login')
    expect(screen.queryByLabelText('Sohbetlerde ara')).toBeNull()
    expect(screen.queryByText('Emsal nedir?')).toBeNull()
    expect(screen.getByText('Proje Bir')).toBeTruthy()
  })

  it('boş durum', () => {
    setup({ conversations: [] })
    expect(screen.getByText('Henüz sohbet yok')).toBeTruthy()
  })

  it('hasMore: Daha fazla göster', async () => {
    const p = setup({ hasMore: true })
    await userEvent.click(screen.getByRole('button', { name: 'Daha fazla göster' }))
    expect(p.onLoadMore).toHaveBeenCalled()
  })

  it('kullanıcı kartı', () => {
    setup()
    const nav = screen.getByRole('navigation', { name: 'Sohbetler' })
    expect(within(nav).getByText('Test Kullanıcı')).toBeTruthy()
  })
})
