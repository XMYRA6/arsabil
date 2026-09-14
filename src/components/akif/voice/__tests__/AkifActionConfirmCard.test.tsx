/** @jest-environment jsdom */
import '@testing-library/jest-dom'
import { render, screen, fireEvent } from '@testing-library/react'
import { AkifActionConfirmCard } from '../AkifActionConfirmCard'

const display = { arsaPayiPct: 45, sahibineDaire: 9, sahibineTL: 900000, toplamMaliyet: 2800000, satisFiyati: 5000000 }
const base = { phase: 'proposal' as const, pendingActionId: 'pa_1', confirmCard: { scenarioName: 'Akif — %45', display, projectRef: { newName: null } } }

it('proposal: shows the facts + Kaydet/Vazgeç', () => {
  render(<AkifActionConfirmCard pending={base} onConfirm={jest.fn()} onCancel={jest.fn()} onUndo={jest.fn()} />)
  expect(screen.getByText(/%45/)).toBeInTheDocument()
  expect(screen.getByText(/9 daire/i)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /kaydet/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /vazgeç/i })).toBeInTheDocument()
})

it('new project (newName null): requires a name before Kaydet fires onConfirm with it', () => {
  const onConfirm = jest.fn()
  render(<AkifActionConfirmCard pending={base} onConfirm={onConfirm} onCancel={jest.fn()} onUndo={jest.fn()} />)
  fireEvent.click(screen.getByRole('button', { name: /kaydet/i }))
  expect(onConfirm).not.toHaveBeenCalled() // name empty
  fireEvent.change(screen.getByLabelText(/proje adı/i), { target: { value: 'Trabzon Arsam' } })
  fireEvent.click(screen.getByRole('button', { name: /kaydet/i }))
  expect(onConfirm).toHaveBeenCalledWith({ projectName: 'Trabzon Arsam', scenarioName: 'Akif — %45' })
})

it('candidates: radio list, Kaydet sends projectId', () => {
  const onConfirm = jest.fn()
  const p = { ...base, candidates: [{ id: 'p1', name: 'A' }, { id: 'p2', name: 'B' }] }
  render(<AkifActionConfirmCard pending={p} onConfirm={onConfirm} onCancel={jest.fn()} onUndo={jest.fn()} />)
  fireEvent.click(screen.getByLabelText('B'))
  fireEvent.click(screen.getByRole('button', { name: /kaydet/i }))
  expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ projectId: 'p2' }))
})

it('saved: shows project name + Geri Al, disabled after undoUntil', () => {
  const past = { phase: 'saved' as const, saved: { projectName: 'Trabzon', undoToken: 'ut', undoUntil: new Date(Date.now() - 1000).toISOString() } }
  render(<AkifActionConfirmCard pending={past} onConfirm={jest.fn()} onCancel={jest.fn()} onUndo={jest.fn()} />)
  expect(screen.getByText(/Trabzon/)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /geri al/i })).toBeDisabled()
})

it('error: shows the message', () => {
  render(<AkifActionConfirmCard pending={{ phase: 'error', errorMessage: 'Süre doldu.' }} onConfirm={jest.fn()} onCancel={jest.fn()} onUndo={jest.fn()} />)
  expect(screen.getByText('Süre doldu.')).toBeInTheDocument()
})
