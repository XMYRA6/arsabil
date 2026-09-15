/** @jest-environment jsdom */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
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

import AkifPage from './page'
import { useSession } from 'next-auth/react'

const turn = {
  intent: 'smalltalk',
  speech: 'Merhaba, nasıl yardımcı olayım?',
  state: 'FRIENDLY',
  facts_used: [],
  assumptions: [],
  missing_fields: [],
  risk_level: 'low',
}

beforeEach(() => {
  ;(useSession as jest.Mock).mockReturnValue({ status: 'unauthenticated' })
  global.fetch = jest
    .fn()
    .mockResolvedValue({ ok: true, status: 200, json: async () => turn }) as jest.Mock
})

function sendText(t: string) {
  const ta = screen.getByRole('textbox')
  fireEvent.change(ta, { target: { value: t } })
  fireEvent.submit(ta.closest('form')!)
}

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
  await waitFor(() => expect((global.fetch as jest.Mock).mock.calls.length).toBe(2))
  const body = JSON.parse((global.fetch as jest.Mock).mock.calls[1][1].body)
  expect(typeof body.conversationId).toBe('string')
  expect(body.userMessage).toBe('iki')
  expect(body.history).toEqual([
    { role: 'user', content: 'bir' },
    { role: 'akif', content: 'Merhaba, nasıl yardımcı olayım?' },
  ])
})

it('503 → Akif kapalı mesajı', async () => {
  ;(global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 503, json: async () => ({}) })
  render(<AkifPage />)
  sendText('merhaba')
  await waitFor(() => expect(screen.getByText(/Akif şu an kapalı/)).toBeInTheDocument())
})

it('fetch reject → bağlantı hatası', async () => {
  ;(global.fetch as jest.Mock).mockRejectedValue(new Error('net'))
  render(<AkifPage />)
  sendText('merhaba')
  await waitFor(() => expect(screen.getByText(/Bağlantı hatası/)).toBeInTheDocument())
})

it('Yeni sohbet: transkripti temizler + yeni conversationId üretir', async () => {
  render(<AkifPage />)
  // Başlangıçta buton yok
  expect(screen.queryByRole('button', { name: 'Yeni sohbet' })).toBeNull()
  sendText('bir')
  await waitFor(() =>
    expect(screen.getByText('Merhaba, nasıl yardımcı olayım?')).toBeInTheDocument(),
  )
  const idBefore = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body).conversationId

  fireEvent.click(screen.getByRole('button', { name: 'Yeni sohbet' }))
  expect(screen.queryByText('bir')).not.toBeInTheDocument()
  expect(screen.queryByText('Merhaba, nasıl yardımcı olayım?')).not.toBeInTheDocument()

  sendText('iki')
  await waitFor(() => expect((global.fetch as jest.Mock).mock.calls.length).toBe(2))
  const body2 = JSON.parse((global.fetch as jest.Mock).mock.calls[1][1].body)
  expect(body2.conversationId).not.toBe(idBefore)
  expect(body2.history).toEqual([]) // temizlendikten sonra geçmiş boş
})

it('pending sırasında ikinci gönderim engellenir', async () => {
  let resolve: (v: unknown) => void = () => {}
  ;(global.fetch as jest.Mock).mockReturnValue(
    new Promise((r) => {
      resolve = r
    }),
  )
  render(<AkifPage />)
  sendText('bir')
  sendText('iki') // pending → yok sayılmalı
  expect((global.fetch as jest.Mock).mock.calls.length).toBe(1)
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

it('sesli konuş → panel açılır, metin composer gizlenir', () => {
  render(<AkifPage />)
  fireEvent.click(screen.getByRole('button', { name: /sesli konuş/i }))
  expect(screen.getByText('SESLI PANEL')).toBeInTheDocument()
  expect(screen.queryByPlaceholderText(/Arsanı ve payı yaz/i)).not.toBeInTheDocument()
})

it('panelden çık → metin moduna döner', () => {
  render(<AkifPage />)
  fireEvent.click(screen.getByRole('button', { name: /sesli konuş/i }))
  fireEvent.click(screen.getByText('panel-exit'))
  expect(screen.queryByText('SESLI PANEL')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: /sesli konuş/i })).toBeInTheDocument()
})

it('oturum açıkken proje listesi çekilir ve seçici görünür', async () => {
  ;(useSession as jest.Mock).mockReturnValue({ status: 'authenticated' })
  ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
    if (url === '/api/projects') {
      return Promise.resolve({
        ok: true,
        json: async () => ({ projects: [{ id: 'p1', name: 'Trabzon Arsa' }] }),
      })
    }
    return Promise.resolve({ ok: true, status: 200, json: async () => turn })
  })
  render(<AkifPage />)
  await waitFor(() =>
    expect(screen.getByRole('combobox', { name: /proje seç/i })).toBeInTheDocument(),
  )
  expect(screen.getByText('Trabzon Arsa')).toBeInTheDocument()
})

it('proje seçilince sonraki istekte projectId gönderilir', async () => {
  ;(useSession as jest.Mock).mockReturnValue({ status: 'authenticated' })
  ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
    if (url === '/api/projects') {
      return Promise.resolve({
        ok: true,
        json: async () => ({ projects: [{ id: 'p1', name: 'Trabzon Arsa' }] }),
      })
    }
    return Promise.resolve({ ok: true, status: 200, json: async () => turn })
  })
  render(<AkifPage />)
  await waitFor(() =>
    expect(screen.getByRole('combobox', { name: /proje seç/i })).toBeInTheDocument(),
  )
  fireEvent.change(screen.getByRole('combobox', { name: /proje seç/i }), {
    target: { value: 'p1' },
  })
  sendText('merhaba')
  await waitFor(() => {
    const calls = (global.fetch as jest.Mock).mock.calls.filter(([u]) => u === '/api/akif/turn')
    expect(calls.length).toBe(1)
  })
  const turnCall = (global.fetch as jest.Mock).mock.calls.find(([u]) => u === '/api/akif/turn')!
  const body = JSON.parse(turnCall[1].body)
  expect(body.projectId).toBe('p1')
})

it('Yeni sohbet sonrası proje seçimi KORUNUR (özelliğin amacı: hafıza sohbetler arası kalıcı)', async () => {
  ;(useSession as jest.Mock).mockReturnValue({ status: 'authenticated' })
  ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
    if (url === '/api/projects') {
      return Promise.resolve({
        ok: true,
        json: async () => ({ projects: [{ id: 'p1', name: 'Trabzon Arsa' }] }),
      })
    }
    return Promise.resolve({ ok: true, status: 200, json: async () => turn })
  })
  render(<AkifPage />)
  await waitFor(() =>
    expect(screen.getByRole('combobox', { name: /proje seç/i })).toBeInTheDocument(),
  )
  fireEvent.change(screen.getByRole('combobox', { name: /proje seç/i }), {
    target: { value: 'p1' },
  })
  sendText('bir')
  await waitFor(() => {
    const calls = (global.fetch as jest.Mock).mock.calls.filter(([u]) => u === '/api/akif/turn')
    expect(calls.length).toBe(1)
  })

  fireEvent.click(screen.getByRole('button', { name: 'Yeni sohbet' }))

  sendText('iki')
  await waitFor(() => {
    const calls = (global.fetch as jest.Mock).mock.calls.filter(([u]) => u === '/api/akif/turn')
    expect(calls.length).toBe(2)
  })
  const secondTurnCall = (global.fetch as jest.Mock).mock.calls
    .filter(([u]) => u === '/api/akif/turn')[1]
  const body = JSON.parse(secondTurnCall[1].body)
  expect(body.projectId).toBe('p1')
})

it('oturum kapalıyken proje seçici görünmez, projectId hiç gönderilmez', async () => {
  ;(useSession as jest.Mock).mockReturnValue({ status: 'unauthenticated' })
  render(<AkifPage />)
  expect(screen.queryByRole('combobox', { name: /proje seç/i })).not.toBeInTheDocument()
  sendText('merhaba')
  await waitFor(() => expect((global.fetch as jest.Mock).mock.calls.length).toBeGreaterThan(0))
  const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body)
  expect(body.projectId).toBeUndefined()
})
