/** @jest-environment jsdom */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import AkifPage from './page'

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
