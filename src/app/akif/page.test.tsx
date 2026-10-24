/** @jest-environment jsdom */
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react'
import '@testing-library/jest-dom'

jest.mock('@/components/akif/voice/AkifVoicePanel', () => ({
  AkifVoicePanel: ({ onExit }: { onExit: () => void }) => (
    <div>
      <span>SESLI PANEL</span>
      <button onClick={onExit}>panel-exit</button>
    </div>
  ),
}))

jest.mock('next-auth/react', () => ({ useSession: jest.fn() }))

const pushMock = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: jest.fn(), refresh: jest.fn() }),
}))

jest.mock('@/components/ui/AppToast', () => ({ bildirimGoster: jest.fn() }))

import AkifPage from './page'
import { useSession } from 'next-auth/react'
import { bildirimGoster } from '@/components/ui/AppToast'

const turn = {
  intent: 'smalltalk',
  speech: 'Merhaba, nasıl yardımcı olayım?',
  state: 'FRIENDLY',
  facts_used: [],
  assumptions: [],
  missing_fields: [],
  risk_level: 'low',
}

const row = (x: number) => ({
  label: `%${Math.round(x * 100)}`,
  arsaPayiX: x,
  arsaSahibiDaireSayisi: 4,
  arsaSahibiDegeriTL: 1000000,
  daireSatisFiyatiTL: 2000000,
})
const offersTurn = (x: number, speech: string) => ({
  ...turn,
  intent: 'compare_contractor',
  speech,
  tool_result: {
    kind: 'contractor_offers',
    rows: [row(x)],
    defaultsUsed: [],
    assumptions: [],
    emsalNote: '',
  },
})
const parcelCard = {
  kind: 'parcel',
  status: 'resolved',
  dto: {
    parcel: { mahalle: 'Yıldızlı', ilce: 'Akcaabat', il: 'Trabzon', areaSqm: 1250 },
    value: { pricePerSqm: { mahalle: 2450 } },
  },
}

beforeEach(() => {
  pushMock.mockReset()
  ;(bildirimGoster as jest.Mock).mockReset()
  ;(useSession as jest.Mock).mockReturnValue({ status: 'unauthenticated', data: null })
  global.fetch = jest
    .fn()
    .mockResolvedValue({ ok: true, status: 200, json: async () => turn }) as jest.Mock
})

afterEach(() => {
  jest.useRealTimers()
})

function sendText(t: string) {
  const ta = composer()
  fireEvent.change(ta, { target: { value: t } })
  fireEvent.submit(ta.closest('form')!)
}
const composer = () =>
  screen.getAllByRole('textbox').find((el) => el.tagName === 'TEXTAREA') as HTMLTextAreaElement
const fetchMock = () => global.fetch as jest.Mock
const calls = (pred: (u: string, init?: RequestInit) => boolean) =>
  fetchMock().mock.calls.filter(([u, i]) => pred(String(u), i))
const turnCalls = () => calls((u) => u === '/api/akif/turn')
const listCalls = () => calls((u) => u.startsWith('/api/akif/conversations?'))
const panel = () => screen.getByRole('complementary', { name: 'Çalışma paneli' })

/* ---------- oturumlu senaryo düzeneği ---------- */

type Res = { ok: boolean; status: number; json: () => Promise<unknown> }
const ok = (data: unknown, status = 200): Res => ({ ok: true, status, json: async () => data })
const fail = (status: number, data: unknown = {}): Res => ({ ok: false, status, json: async () => data })

interface AuthedOpts {
  conversations?: unknown[]
  nextCursor?: string | null
  conversation?: { conversation: unknown; messages: unknown[] }
  turns?: Res[]
  remove?: () => Promise<Res>
  rename?: () => Promise<Res>
  /** id başına GET yanıtı (ertelenebilir); yoksa `conversation ?? storedC1`. */
  byId?: Record<string, () => Promise<Res>>
  /** Tur yanıtı fabrikası (ertelenebilir); verilirse `turns` yerine kullanılır. */
  turnFn?: () => Promise<Res>
}

const conv1 = { id: 'c1', title: 'Akçaabat arsa değeri', projectId: null, lastMessageAt: new Date().toISOString() }
const storedC1 = {
  conversation: conv1,
  messages: [
    { id: 'm1', role: 'user', content: 'Akçaabat 1250 m²', turn: null, card: null, channel: 'text', createdAt: '2026-10-24T10:00:00Z' },
    { id: 'm2', role: 'akif', content: 'Parsel bulundu', turn: null, card: parcelCard, channel: 'voice', createdAt: '2026-10-24T10:00:01Z' },
    { id: 'm3', role: 'user', content: 'müteahhit teklifi %46', turn: null, card: null, channel: 'text', createdAt: '2026-10-24T10:00:02Z' },
    {
      id: 'm4',
      role: 'akif',
      content: 'Arsa sahibine %46 düşer.',
      turn: offersTurn(0.46, 'Arsa sahibine %46 düşer.'),
      card: null,
      channel: 'text',
      createdAt: '2026-10-24T10:00:03Z',
    },
  ],
}
const siteProject = {
  id: 'p1',
  name: 'Trabzon Arsa',
  updatedAt: '2026-10-20T10:00:00Z',
  scenarios: [{ arsaAlani: 1000, landShareRatio: 0.4 }],
}
const kartProject = {
  id: 'k1',
  name: 'Kart A',
  updatedAt: '2026-10-21T10:00:00Z',
  parcels: ['Akçaabat parseli'],
  inputs: { arsaAlani: 900, arsaSahibiPayiYuzde: 45 },
}

function setupAuthed(o: AuthedOpts = {}) {
  ;(useSession as jest.Mock).mockReturnValue({
    status: 'authenticated',
    data: { user: { name: 'Test Kullanıcı' } },
  })
  const turns = [...(o.turns ?? [])]
  fetchMock().mockImplementation((url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET'
    if (url.startsWith('/api/akif/conversations?')) {
      return Promise.resolve(ok({ items: o.conversations ?? [conv1], nextCursor: o.nextCursor ?? null }))
    }
    if (url.startsWith('/api/akif/conversations/')) {
      if (method === 'DELETE') return o.remove ? o.remove() : Promise.resolve(ok(null, 204))
      if (method === 'PATCH') return o.rename ? o.rename() : Promise.resolve(ok(null, 204))
      const id = url.slice('/api/akif/conversations/'.length)
      if (o.byId?.[id]) return o.byId[id]()
      return Promise.resolve(ok(o.conversation ?? storedC1))
    }
    if (url === '/api/projects') return Promise.resolve(ok({ projects: [siteProject] }))
    if (url === '/api/akif/projeler') return Promise.resolve(ok({ projects: [kartProject] }))
    if (url === '/api/akif/turn') return o.turnFn ? o.turnFn() : Promise.resolve(turns.shift() ?? ok(turn))
    return Promise.resolve(fail(404))
  })
}

async function openC1() {
  fireEvent.click(await screen.findByRole('button', { name: 'Akçaabat arsa değeri' }))
  await waitFor(() => expect(screen.getByText('Arsa sahibine %46 düşer.')).toBeInTheDocument())
}

/* ---------- misafir (mevcut davranış korunur) ---------- */

it('mesaj gönderince kullanıcı balonu + akif cevabı görünür', async () => {
  render(<AkifPage />)
  sendText('merhaba')
  expect(screen.getByText('merhaba')).toBeInTheDocument()
  await waitFor(() =>
    expect(screen.getByText('Merhaba, nasıl yardımcı olayım?')).toBeInTheDocument(),
  )
})

it('istek gövdesi conversationId + history + userMessage içerir', async () => {
  render(<AkifPage />)
  sendText('bir')
  await waitFor(() =>
    expect(screen.getByText('Merhaba, nasıl yardımcı olayım?')).toBeInTheDocument(),
  )
  sendText('iki')
  await waitFor(() => expect(fetchMock().mock.calls.length).toBe(2))
  const body = JSON.parse(fetchMock().mock.calls[1][1].body)
  expect(typeof body.conversationId).toBe('string')
  expect(body.userMessage).toBe('iki')
  expect(body.history).toEqual([
    { role: 'user', content: 'bir' },
    { role: 'akif', content: 'Merhaba, nasıl yardımcı olayım?' },
  ])
})

it('503 → Akif kapalı mesajı', async () => {
  fetchMock().mockResolvedValue({ ok: false, status: 503, json: async () => ({}) })
  render(<AkifPage />)
  sendText('merhaba')
  await waitFor(() => expect(screen.getByText(/Akif şu an kapalı/)).toBeInTheDocument())
})

it('fetch reject → bağlantı hatası', async () => {
  fetchMock().mockRejectedValue(new Error('net'))
  render(<AkifPage />)
  sendText('merhaba')
  await waitFor(() => expect(screen.getByText(/Bağlantı hatası/)).toBeInTheDocument())
})

it('Yeni sohbet: transkripti temizler + yeni conversationId üretir', async () => {
  render(<AkifPage />)
  sendText('bir')
  await waitFor(() =>
    expect(screen.getByText('Merhaba, nasıl yardımcı olayım?')).toBeInTheDocument(),
  )
  const idBefore = JSON.parse(fetchMock().mock.calls[0][1].body).conversationId

  fireEvent.click(screen.getByRole('button', { name: 'Yeni sohbet' }))
  expect(screen.queryByText('bir')).not.toBeInTheDocument()
  expect(screen.queryByText('Merhaba, nasıl yardımcı olayım?')).not.toBeInTheDocument()

  sendText('iki')
  await waitFor(() => expect(fetchMock().mock.calls.length).toBe(2))
  const body2 = JSON.parse(fetchMock().mock.calls[1][1].body)
  expect(body2.conversationId).not.toBe(idBefore)
  expect(body2.history).toEqual([])
})

it('pending sırasında ikinci gönderim engellenir', async () => {
  let resolve: (v: unknown) => void = () => {}
  fetchMock().mockReturnValue(
    new Promise((r) => {
      resolve = r
    }),
  )
  render(<AkifPage />)
  sendText('bir')
  sendText('iki')
  expect(fetchMock().mock.calls.length).toBe(1)
  resolve({ ok: true, status: 200, json: async () => turn })
  await waitFor(() =>
    expect(screen.getByText('Merhaba, nasıl yardımcı olayım?')).toBeInTheDocument(),
  )
})

it('varsayılan metin modu — sesli konuş butonu görünür', () => {
  render(<AkifPage />)
  expect(screen.getByRole('button', { name: /sesli konuş/i })).toBeInTheDocument()
  expect(screen.queryByText('SESLI PANEL')).not.toBeInTheDocument()
})

it('sesli konuş → panel açılır, metin composer gizlenir; kenar çubuğu ve panel yerinde kalır', () => {
  render(<AkifPage />)
  fireEvent.click(screen.getByRole('button', { name: /sesli konuş/i }))
  expect(screen.getByText('SESLI PANEL')).toBeInTheDocument()
  expect(screen.queryByPlaceholderText(/Mesaj yaz/i)).not.toBeInTheDocument()
  expect(screen.getByRole('navigation', { name: 'Sohbetler' })).toBeInTheDocument()
  expect(panel()).toBeInTheDocument()
})

it('panelden çık → metin moduna döner', () => {
  render(<AkifPage />)
  fireEvent.click(screen.getByRole('button', { name: /sesli konuş/i }))
  fireEvent.click(screen.getByText('panel-exit'))
  expect(screen.queryByText('SESLI PANEL')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: /sesli konuş/i })).toBeInTheDocument()
})

it('misafir: sohbet listesi hiç çağrılmaz, giriş bandı görünür, projectId gönderilmez', async () => {
  render(<AkifPage />)
  expect(screen.getByText('Sohbetlerini kaydetmek için giriş yap')).toBeInTheDocument()
  expect(screen.queryByRole('combobox', { name: /proje seç/i })).not.toBeInTheDocument()
  sendText('merhaba')
  await waitFor(() =>
    expect(screen.getByText('Merhaba, nasıl yardımcı olayım?')).toBeInTheDocument(),
  )
  expect(calls((u) => u.startsWith('/api/akif/conversations')).length).toBe(0)
  expect(calls((u) => u === '/api/projects' || u === '/api/akif/projeler').length).toBe(0)
  const body = JSON.parse(turnCalls()[0][1]!.body as string)
  expect(body.projectId).toBeUndefined()
})

/* ---------- oturumlu ---------- */

it('oturumlu açılış: sohbet listesi, site projeleri ve proje kartları çekilir; eski proje seçicisi yok', async () => {
  setupAuthed()
  render(<AkifPage />)
  await waitFor(() => expect(listCalls().length).toBeGreaterThan(0))
  await waitFor(() => expect(calls((u) => u === '/api/projects').length).toBe(1))
  expect(calls((u) => u === '/api/akif/projeler').length).toBe(1)
  expect(await screen.findByRole('button', { name: /Trabzon Arsa/ })).toBeInTheDocument()
  expect(screen.queryByRole('combobox', { name: /proje seç/i })).not.toBeInTheDocument()
})

it('sohbete tıklayınca mesajlar yüklenir; panel son değerleri gösterir ve vurgu YOK', async () => {
  setupAuthed()
  render(<AkifPage />)
  await openC1()
  expect(calls((u, i) => u === '/api/akif/conversations/c1' && (i?.method ?? 'GET') === 'GET').length).toBe(1)
  expect(screen.getByText('Akçaabat 1250 m²')).toBeInTheDocument()
  const p = panel()
  expect(within(p).getByText('%46')).toBeInTheDocument()
  expect(within(p).getByText('1.250 m²')).toBeInTheDocument()
  expect(p.querySelector('[data-changed]')).toBeNull()
  // başlık üst çubukta
  expect(screen.getByRole('button', { name: /Akçaabat arsa değeri.*adını değiştir/ })).toBeInTheDocument()
})

it('yüklenen sohbette sonraki tur: history saklı mesajlardan, gövdede aynı conversationId', async () => {
  setupAuthed()
  render(<AkifPage />)
  await openC1()
  sendText('devam')
  await waitFor(() => expect(turnCalls().length).toBe(1))
  const body = JSON.parse(turnCalls()[0][1]!.body as string)
  expect(body.conversationId).toBe('c1')
  expect(body.history).toEqual([
    { role: 'user', content: 'Akçaabat 1250 m²' },
    { role: 'akif', content: 'Parsel bulundu' },
    { role: 'user', content: 'müteahhit teklifi %46' },
    { role: 'akif', content: 'Arsa sahibine %46 düşer.' },
  ])
})

it('canlı tur paneldeki değeri değiştirirse data-changed çıkar ve ~1,6 sn sonra temizlenir', async () => {
  jest.useFakeTimers()
  setupAuthed({ turns: [ok(offersTurn(0.5, 'Şimdi %50 oldu.'))] })
  render(<AkifPage />)
  await openC1()
  sendText('yüzde elli yap')
  await waitFor(() => expect(screen.getByText('Şimdi %50 oldu.')).toBeInTheDocument())
  const changed = within(panel()).getByText('%46 → %50')
  expect(changed.closest('[data-changed]')).toBeTruthy()
  act(() => {
    jest.advanceTimersByTime(1700)
  })
  expect(panel().querySelector('[data-changed]')).toBeNull()
  expect(within(panel()).getAllByText('%50').length).toBeGreaterThan(0)
})

it('başarılı turdan sonra sohbet listesi yenilenir', async () => {
  setupAuthed()
  render(<AkifPage />)
  await waitFor(() => expect(listCalls().length).toBe(1))
  sendText('merhaba')
  await waitFor(() => expect(screen.getByText('Merhaba, nasıl yardımcı olayım?')).toBeInTheDocument())
  await waitFor(() => expect(listCalls().length).toBe(2))
})

it('409 conversation_conflict → yeni conversationId ile bir kez yeniden dener (history aynı)', async () => {
  setupAuthed({ turns: [fail(409, { error: 'conversation_conflict' }), ok(turn)] })
  render(<AkifPage />)
  sendText('merhaba')
  await waitFor(() => expect(screen.getByText('Merhaba, nasıl yardımcı olayım?')).toBeInTheDocument())
  expect(turnCalls().length).toBe(2)
  const b1 = JSON.parse(turnCalls()[0][1]!.body as string)
  const b2 = JSON.parse(turnCalls()[1][1]!.body as string)
  expect(b2.conversationId).not.toBe(b1.conversationId)
  expect(b2.history).toEqual(b1.history)
  expect(b2.userMessage).toBe('merhaba')
  // sonraki tur da yeni kimlikle gider
  sendText('iki')
  await waitFor(() => expect(turnCalls().length).toBe(3))
  expect(JSON.parse(turnCalls()[2][1]!.body as string).conversationId).toBe(b2.conversationId)
})

it('409 iki kez → hata satırı, üçüncü deneme yok', async () => {
  setupAuthed({
    turns: [fail(409, { error: 'conversation_conflict' }), fail(409, { error: 'conversation_conflict' })],
  })
  render(<AkifPage />)
  sendText('merhaba')
  await waitFor(() => expect(screen.getByText(/Bir sorun oldu/)).toBeInTheDocument())
  expect(turnCalls().length).toBe(2)
})

it('Yeni sohbet girdileri ve panel durumunu sıfırlar, yeni conversationId üretir', async () => {
  setupAuthed()
  render(<AkifPage />)
  await openC1()
  expect(within(panel()).getByText('%46')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Yeni sohbet' }))
  expect(screen.queryByText('Arsa sahibine %46 düşer.')).not.toBeInTheDocument()
  expect(within(panel()).getByText('Bir arsa söyle, burada değerleri göreceksin')).toBeInTheDocument()
  sendText('selam')
  await waitFor(() => expect(turnCalls().length).toBe(1))
  const body = JSON.parse(turnCalls()[0][1]!.body as string)
  expect(body.conversationId).not.toBe('c1')
  expect(body.history).toEqual([])
})

it('Rapor oluştur: panel boşken devre dışı; doluyken /hesapla?alan&il&ilce', async () => {
  setupAuthed()
  render(<AkifPage />)
  expect(within(panel()).getByRole('button', { name: 'Rapor oluştur' })).toBeDisabled()
  await openC1()
  const btn = within(panel()).getByRole('button', { name: 'Rapor oluştur' })
  expect(btn).not.toBeDisabled()
  fireEvent.click(btn)
  expect(pushMock).toHaveBeenCalledWith('/hesapla?alan=1250&il=Trabzon&ilce=Akcaabat')
})

it('Rapor oluştur: konum ayrıştırılamazsa yalnız alan', async () => {
  setupAuthed()
  render(<AkifPage />)
  fireEvent.click(await screen.findByRole('button', { name: /Kart A/ }))
  fireEvent.click(within(panel()).getByRole('button', { name: 'Rapor oluştur' }))
  expect(pushMock).toHaveBeenCalledWith('/hesapla?alan=900')
})

it('site projesi senaryosu: boş sohbette bağlanır, sonraki turda projectId gövdede', async () => {
  setupAuthed()
  render(<AkifPage />)
  fireEvent.click(await screen.findByRole('button', { name: /Trabzon Arsa/ }))
  expect(within(panel()).getByText('%40')).toBeInTheDocument()
  sendText('bu projeyi konuşalım')
  await waitFor(() => expect(turnCalls().length).toBe(1))
  expect(JSON.parse(turnCalls()[0][1]!.body as string).projectId).toBe('p1')
})

it('site projesi senaryosu: dolu sohbette yeni sohbet açılıp bağlanır (proje hafızası sohbetler arası)', async () => {
  setupAuthed()
  render(<AkifPage />)
  fireEvent.click(await screen.findByRole('button', { name: /Trabzon Arsa/ }))
  sendText('bir')
  await waitFor(() => expect(screen.getByText('Merhaba, nasıl yardımcı olayım?')).toBeInTheDocument())
  const id1 = JSON.parse(turnCalls()[0][1]!.body as string).conversationId

  fireEvent.click(screen.getByRole('button', { name: /Trabzon Arsa/ }))
  expect(screen.queryByText('Merhaba, nasıl yardımcı olayım?')).not.toBeInTheDocument()
  sendText('iki')
  await waitFor(() => expect(turnCalls().length).toBe(2))
  const b2 = JSON.parse(turnCalls()[1][1]!.body as string)
  expect(b2.conversationId).not.toBe(id1)
  expect(b2.projectId).toBe('p1')
  expect(b2.history).toEqual([])
})

it('Yeni sohbet proje bağını kaldırır', async () => {
  setupAuthed()
  render(<AkifPage />)
  fireEvent.click(await screen.findByRole('button', { name: /Trabzon Arsa/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Yeni sohbet' }))
  sendText('genel soru')
  await waitFor(() => expect(turnCalls().length).toBe(1))
  expect(JSON.parse(turnCalls()[0][1]!.body as string).projectId).toBeUndefined()
})

it('proje kartı senaryosu: panel dolar, besteciye taslak konur, gönderilmez', async () => {
  setupAuthed()
  render(<AkifPage />)
  fireEvent.click(await screen.findByRole('button', { name: /Kart A/ }))
  expect(within(panel()).getByText('900 m²')).toBeInTheDocument()
  expect(within(panel()).getByText('%45')).toBeInTheDocument()
  expect(composer().value).toBe('Kart A senaryosunu güncelleyelim:')
  expect(document.activeElement).toBe(composer())
  expect(turnCalls().length).toBe(0)
})

it('sohbet sil: ağ hatasında hata bildirimi, ardından liste yenilenir', async () => {
  setupAuthed({ remove: () => Promise.reject(new Error('net')) })
  render(<AkifPage />)
  await screen.findByRole('button', { name: 'Akçaabat arsa değeri' })
  const before = listCalls().length
  fireEvent.click(screen.getByRole('button', { name: 'Sohbet işlemleri' }))
  fireEvent.click(screen.getByRole('button', { name: /Sil/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Evet, sil' }))
  await waitFor(() =>
    expect(bildirimGoster).toHaveBeenCalledWith(expect.objectContaining({ tip: 'hata' })),
  )
  await waitFor(() => expect(listCalls().length).toBe(before + 1))
})

it('sohbet yeniden adlandır: ağ hatasında hata bildirimi', async () => {
  setupAuthed({ rename: () => Promise.reject(new Error('net')) })
  render(<AkifPage />)
  await screen.findByRole('button', { name: 'Akçaabat arsa değeri' })
  fireEvent.click(screen.getByRole('button', { name: 'Sohbet işlemleri' }))
  fireEvent.click(screen.getByRole('button', { name: /Yeniden adlandır/ }))
  const input = screen.getByRole('textbox', { name: 'Sohbet adı' })
  fireEvent.change(input, { target: { value: 'Yeni ad' } })
  fireEvent.keyDown(input, { key: 'Enter' })
  await waitFor(() =>
    expect(bildirimGoster).toHaveBeenCalledWith(expect.objectContaining({ tip: 'hata' })),
  )
})

it('Daha fazla göster sonraki sayfayı imleçle ister', async () => {
  setupAuthed({ nextCursor: 'cur1' })
  render(<AkifPage />)
  fireEvent.click(await screen.findByRole('button', { name: 'Daha fazla göster' }))
  await waitFor(() => expect(listCalls().some(([u]) => String(u).includes('cursor=cur1'))).toBe(true))
})

it('üst çubuk başlığı: yeniden adlandırma etkin sohbete PATCH gönderir', async () => {
  setupAuthed()
  render(<AkifPage />)
  await openC1()
  fireEvent.click(screen.getByRole('button', { name: /adını değiştir/ }))
  const input = screen.getByRole('textbox', { name: 'Sohbet başlığı' })
  fireEvent.change(input, { target: { value: 'Akçaabat yeni' } })
  fireEvent.keyDown(input, { key: 'Enter' })
  await waitFor(() => {
    const patch = calls((u, i) => u === '/api/akif/conversations/c1' && i?.method === 'PATCH')
    expect(patch.length).toBe(1)
    expect(JSON.parse(patch[0][1]!.body as string)).toEqual({ title: 'Akçaabat yeni' })
  })
})

/* ---------- fix turu 1: yarış koşulları ve küçük düzeltmeler ---------- */

function deferred<T>() {
  let resolve!: (v: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}
const mkConv = (id: string, title: string) => ({ id, title, projectId: null, lastMessageAt: new Date().toISOString() })
const stored = (id: string, title: string, text: string) => ({
  conversation: mkConv(id, title),
  messages: [
    { id: `${id}-u`, role: 'user', content: `${text} soru`, turn: null, card: null, channel: 'text', createdAt: '2026-10-24T10:00:00Z' },
    {
      id: `${id}-a`,
      role: 'akif',
      content: `${text} cevap`,
      turn: offersTurn(0.3, `${text} cevap`),
      card: null,
      channel: 'text',
      createdAt: '2026-10-24T10:00:01Z',
    },
  ],
})
const convB = mkConv('c2', 'B sohbeti')
const convC = mkConv('c3', 'C sohbeti')

describe.each(['load-then-reply', 'reply-then-load'] as const)(
  'yükleme sürerken gönderim (%s): yanıt B görünümüne karışmaz',
  (order) => {
    it('A yanıtı yalnız A görünümünde; B mesajları/paneli görünmez', async () => {
      const loadB = deferred<Res>()
      const reply = deferred<Res>()
      setupAuthed({
        conversations: [conv1, convB],
        byId: {
          c1: () => Promise.resolve(ok(storedC1)),
          c2: () => loadB.promise,
        },
        turnFn: () => reply.promise,
      })
      render(<AkifPage />)
      await openC1()
      fireEvent.click(screen.getByRole('button', { name: 'B sohbeti' }))
      sendText('A için soru')
      await waitFor(() => expect(turnCalls().length).toBe(1))
      expect(JSON.parse(turnCalls()[0][1]!.body as string).conversationId).toBe('c1')

      const resolveLoad = async () => {
        await act(async () => {
          loadB.resolve(ok(stored('c2', 'B sohbeti', 'B')))
        })
      }
      const resolveReply = async () => {
        await act(async () => {
          reply.resolve(ok(offersTurn(0.5, 'A yanıtı %50')))
        })
      }
      if (order === 'load-then-reply') {
        await resolveLoad()
        await resolveReply()
      } else {
        await resolveReply()
        await resolveLoad()
      }
      await waitFor(() => expect(screen.getByText('A yanıtı %50')).toBeInTheDocument())
      expect(screen.queryByText('B soru')).not.toBeInTheDocument()
      expect(screen.queryByText('B cevap')).not.toBeInTheDocument()
      expect(screen.getByText('Arsa sahibine %46 düşer.')).toBeInTheDocument()
      expect(within(panel()).queryByText('%30')).not.toBeInTheDocument()
      sendText('devam')
      await waitFor(() => expect(turnCalls().length).toBe(2))
      expect(JSON.parse(turnCalls()[1][1]!.body as string).conversationId).toBe('c1')
    })
  },
)

it('A→B→C hızlı geçiş: yalnız C gösterilir (eski yüklemeler düşer)', async () => {
  const la = deferred<Res>()
  const lb = deferred<Res>()
  const lc = deferred<Res>()
  setupAuthed({
    conversations: [conv1, convB, convC],
    byId: { c1: () => la.promise, c2: () => lb.promise, c3: () => lc.promise },
  })
  render(<AkifPage />)
  fireEvent.click(await screen.findByRole('button', { name: 'Akçaabat arsa değeri' }))
  fireEvent.click(screen.getByRole('button', { name: 'B sohbeti' }))
  fireEvent.click(screen.getByRole('button', { name: 'C sohbeti' }))
  await act(async () => {
    lc.resolve(ok(stored('c3', 'C sohbeti', 'C')))
  })
  await act(async () => {
    lb.resolve(ok(stored('c2', 'B sohbeti', 'B')))
    la.resolve(ok(storedC1))
  })
  await waitFor(() => expect(screen.getByText('C cevap')).toBeInTheDocument())
  expect(screen.queryByText('B cevap')).not.toBeInTheDocument()
  expect(screen.queryByText('Arsa sahibine %46 düşer.')).not.toBeInTheDocument()
  sendText('C devam')
  await waitFor(() => expect(turnCalls().length).toBe(1))
  expect(JSON.parse(turnCalls()[0][1]!.body as string).conversationId).toBe('c3')
})

it('proje kartı senaryosu dolu sohbette: yeni sohbet, projectId yok, taslak konur, gönderilmez', async () => {
  setupAuthed()
  render(<AkifPage />)
  await openC1()
  fireEvent.click(screen.getByRole('button', { name: /Kart A/ }))
  expect(screen.queryByText('Arsa sahibine %46 düşer.')).not.toBeInTheDocument()
  expect(within(panel()).getByText('900 m²')).toBeInTheDocument()
  expect(composer().value).toBe('Kart A senaryosunu güncelleyelim:')
  expect(turnCalls().length).toBe(0)
  fireEvent.submit(composer().closest('form')!)
  await waitFor(() => expect(turnCalls().length).toBe(1))
  const body = JSON.parse(turnCalls()[0][1]!.body as string)
  expect(body.conversationId).not.toBe('c1')
  expect(body.projectId).toBeUndefined()
  expect(body.history).toEqual([])
  expect(body.userMessage).toBe('Kart A senaryosunu güncelleyelim:')
})

it('tur sürerken etkin sohbet silinemez: bildirim, DELETE yok, görünüm yerinde', async () => {
  const reply = deferred<Res>()
  setupAuthed({ turnFn: () => reply.promise })
  render(<AkifPage />)
  await openC1()
  sendText('bekle')
  await waitFor(() => expect(turnCalls().length).toBe(1))
  fireEvent.click(screen.getByRole('button', { name: 'Sohbet işlemleri' }))
  fireEvent.click(screen.getByRole('button', { name: /Sil/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Evet, sil' }))
  await waitFor(() =>
    expect(bildirimGoster).toHaveBeenCalledWith(expect.objectContaining({ tip: 'hata' })),
  )
  expect(calls((u, i) => u.startsWith('/api/akif/conversations/') && i?.method === 'DELETE').length).toBe(0)
  await act(async () => {
    reply.resolve(ok(turn))
  })
  await waitFor(() => expect(screen.getByText('Merhaba, nasıl yardımcı olayım?')).toBeInTheDocument())
  expect(screen.getByText('Arsa sahibine %46 düşer.')).toBeInTheDocument()
})

it('başlık yeniden adlandırma: listede görünmese de kaydedilmiş sohbete PATCH gider', async () => {
  // Liste boş döner (ör. arama süzgeci) ama başarılı tur sohbeti sunucuda oluşturdu.
  setupAuthed({ conversations: [] })
  render(<AkifPage />)
  sendText('merhaba')
  await waitFor(() => expect(screen.getByText('Merhaba, nasıl yardımcı olayım?')).toBeInTheDocument())
  const cid = JSON.parse(turnCalls()[0][1]!.body as string).conversationId
  fireEvent.click(screen.getByRole('button', { name: /adını değiştir/ }))
  const input = screen.getByRole('textbox', { name: 'Sohbet başlığı' })
  fireEvent.change(input, { target: { value: 'Benim sohbetim' } })
  fireEvent.keyDown(input, { key: 'Enter' })
  await waitFor(() =>
    expect(calls((u, i) => u === `/api/akif/conversations/${cid}` && i?.method === 'PATCH').length).toBe(1),
  )
})

it('kaydedilmemiş yeni sohbette başlık yalnız yerel değişir (PATCH yok)', () => {
  setupAuthed({ conversations: [] })
  render(<AkifPage />)
  fireEvent.click(screen.getByRole('button', { name: /adını değiştir/ }))
  const input = screen.getByRole('textbox', { name: 'Sohbet başlığı' })
  fireEvent.change(input, { target: { value: 'Taslak ad' } })
  fireEvent.keyDown(input, { key: 'Enter' })
  expect(calls((_u, i) => i?.method === 'PATCH').length).toBe(0)
  expect(screen.getByRole('button', { name: /Taslak ad.*adını değiştir/ })).toBeInTheDocument()
})
