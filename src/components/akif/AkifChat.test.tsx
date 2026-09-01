/** @jest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react'
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
  expect(screen.getByText(/Akif Usta/)).toBeInTheDocument()
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
