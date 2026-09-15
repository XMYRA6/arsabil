/** @jest-environment jsdom */
import '@testing-library/jest-dom'
import { render, screen, fireEvent } from '@testing-library/react'

const startMock = jest.fn()
const stopMock = jest.fn()
let hookState: Record<string, unknown>

jest.mock('../useRealtimeVoice', () => ({
  useRealtimeVoice: () => hookState,
}))

import { AkifVoicePanel } from '../AkifVoicePanel'

beforeEach(() => {
  jest.clearAllMocks()
  hookState = {
    status: 'idle', transcript: [], elapsedSec: 0, errorText: null, pendingAction: null,
    start: startMock, stop: stopMock,
  }
})

it('idle: başlat butonu start çağırır', () => {
  render(<AkifVoicePanel onExit={jest.fn()} />)
  fireEvent.click(screen.getByRole('button', { name: /konuşmaya başla/i }))
  expect(startMock).toHaveBeenCalled()
})

it('listening: süre ve Bitir butonu', () => {
  hookState.status = 'listening'
  hookState.elapsedSec = 65
  render(<AkifVoicePanel onExit={jest.fn()} />)
  expect(screen.getByText('1:05')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /bitir/i }))
  expect(stopMock).toHaveBeenCalledWith('user_ended')
})

it('error: hata bandı + tekrar dene', () => {
  hookState.status = 'error'
  hookState.errorText = 'Mikrofon izni lazım.'
  render(<AkifVoicePanel onExit={jest.fn()} />)
  expect(screen.getByText('Mikrofon izni lazım.')).toBeInTheDocument()
})

it('metne dön: onExit + stop', () => {
  const onExit = jest.fn()
  hookState.status = 'listening'
  render(<AkifVoicePanel onExit={onExit} />)
  fireEvent.click(screen.getByRole('button', { name: /metne dön/i }))
  expect(stopMock).toHaveBeenCalled()
  expect(onExit).toHaveBeenCalled()
})

it('reconnecting: yeniden bağlanma ipucu, hata bandı yok', () => {
  hookState.status = 'reconnecting'
  hookState.errorText = null
  render(<AkifVoicePanel onExit={jest.fn()} />)
  expect(screen.getByText(/yeniden kuruluyor/i)).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /tekrar dene/i })).not.toBeInTheDocument()
})

it('pendingAction: onay kartını render eder', () => {
  hookState.pendingAction = {
    phase: 'proposal',
    pendingActionId: 'pa_1',
    confirmCard: {
      scenarioName: 'Akif — %45',
      display: {
        arsaPayiPct: 45,
        sahibineDaire: 9,
        sahibineTL: 900000,
        toplamMaliyet: 2800000,
        satisFiyati: 5000000,
      },
      projectRef: { newName: null },
    },
  }
  hookState.confirmPendingAction = jest.fn()
  hookState.cancelPendingAction = jest.fn()
  hookState.undoLastAction = jest.fn()
  render(<AkifVoicePanel onExit={jest.fn()} />)
  expect(screen.getByRole('button', { name: /kaydet/i })).toBeInTheDocument()
})

// Regresyon (panel seviyesi): AkifActionConfirmCard.test.tsx'teki "key değişince" testi kartı
// DOĞRUDAN render edip key'i testin kendisi veriyor — bu yüzden panel'deki gerçek
// `key={v.pendingAction.pendingActionId ?? v.pendingAction.phase}` satırı kaldırılsa bile o test
// hep geçer (placebo). Bu test panel'i gerçekten render edip hook'un pendingAction'ını hookState
// üzerinden değiştirip aynı ağacı rerender ediyor — panel'deki key satırını sınıyor.
it('pendingAction sırayla iki farklı teklif verince (panel key): önceki teklife girilen değer yeni teklife sızmaz', () => {
  hookState.pendingAction = {
    phase: 'proposal',
    pendingActionId: 'pa_1',
    confirmCard: {
      scenarioName: 'İlk Senaryo',
      display: {
        arsaPayiPct: 45,
        sahibineDaire: 9,
        sahibineTL: 900000,
        toplamMaliyet: 2800000,
        satisFiyati: 5000000,
      },
      projectRef: { newName: null },
    },
  }
  hookState.confirmPendingAction = jest.fn()
  hookState.cancelPendingAction = jest.fn()
  hookState.undoLastAction = jest.fn()

  const { rerender } = render(<AkifVoicePanel onExit={jest.fn()} />)

  fireEvent.change(screen.getByLabelText(/senaryo adı/i), { target: { value: 'KULLANICI YAZDI' } })
  expect(screen.getByLabelText(/senaryo adı/i)).toHaveValue('KULLANICI YAZDI')

  hookState.pendingAction = {
    phase: 'proposal',
    pendingActionId: 'pa_2',
    confirmCard: {
      scenarioName: 'İkinci Senaryo',
      display: {
        arsaPayiPct: 60,
        sahibineDaire: 12,
        sahibineTL: 1200000,
        toplamMaliyet: 3200000,
        satisFiyati: 6000000,
      },
      projectRef: { newName: null },
    },
  }

  rerender(<AkifVoicePanel onExit={jest.fn()} />)

  expect(screen.getByLabelText(/senaryo adı/i)).toHaveValue('İkinci Senaryo')
})
