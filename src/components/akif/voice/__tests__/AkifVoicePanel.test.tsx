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
    status: 'idle', transcript: [], elapsedSec: 0, errorText: null,
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
