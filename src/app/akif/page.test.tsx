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
