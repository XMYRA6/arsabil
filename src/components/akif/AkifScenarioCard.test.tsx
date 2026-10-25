/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import type { ScenarioCard } from '@/lib/ai/akif/contract'
import { AkifScenarioCard } from './AkifScenarioCard'

const card: ScenarioCard = {
  kind: 'contractor_offers',
  rows: [
    { label: 'Müteahhit %45', arsaPayiX: 0.55, arsaSahibiDaireSayisi: 7, arsaSahibiDegeriTL: 14000000, daireSatisFiyatiTL: 2000000 },
    { label: 'Müteahhit %50', arsaPayiX: 0.5, arsaSahibiDaireSayisi: null, arsaSahibiDegeriTL: null, daireSatisFiyatiTL: 2000000 },
  ],
  defaultsUsed: ['Kalite: orta (varsayılan)'],
  assumptions: ['Yapılaşma alanı = arsa alanı × emsal'],
  emsalNote: 'Emsal alanı = 900 × 1,5 = 1.350 m² — TAKS ve çekme mesafesi yok sayıldı.',
}

it('kind başlığı + satırlar', () => {
  render(<AkifScenarioCard card={card} />)
  expect(screen.getByText(/Müteahhit Payı Senaryoları/)).toBeInTheDocument()
  expect(screen.getByText('Müteahhit %45')).toBeInTheDocument()
  expect(screen.getByText('%55')).toBeInTheDocument()
})

it('null arsa sahibi alanları tire gösterir', () => {
  render(<AkifScenarioCard card={card} />)
  expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2)
})

it('emsalNote gösterilir, defaultsUsed gösterilmez', () => {
  render(<AkifScenarioCard card={card} />)
  expect(screen.getByText(/Emsal alanı = 900/)).toBeInTheDocument()
  expect(screen.queryByText('Kalite: orta (varsayılan)')).not.toBeInTheDocument()
})

it('apartment_sizes başlığı', () => {
  render(<AkifScenarioCard card={{ ...card, kind: 'apartment_sizes' }} />)
  expect(screen.getByText(/Daire Büyüklüğü Senaryoları/)).toBeInTheDocument()
})

it('scenario card renders recommendation block when present and none when absent', () => {
  const { rerender, container } = render(<AkifScenarioCard card={card} />)
  expect(screen.queryByText(/Akif'in önerisi/)).toBeNull()
  expect(container.querySelector('[aria-current="true"]')).toBeNull()
  rerender(<AkifScenarioCard card={{ ...card, recommendation: { rowIndex: 1, criterion: 'en yüksek değer', reason: 'Daha avantajlı.' } }} />)
  expect(screen.getByText(/Akif'in önerisi/)).toBeInTheDocument()
  expect(screen.getByText('Daha avantajlı.')).toBeInTheDocument()
  expect(screen.getByText(/Ölçüt: en yüksek değer/)).toBeInTheDocument()
  expect(screen.getAllByText('Müteahhit %50')[0].closest('tr')).toHaveAttribute('aria-current', 'true')
})

it('table has an accessible name and column-scoped headers', () => {
  render(<AkifScenarioCard card={card} />)
  expect(screen.getByRole('table', { name: 'Senaryo karşılaştırma' })).toBeInTheDocument()
  screen.getAllByRole('columnheader').forEach((h) => expect(h).toHaveAttribute('scope', 'col'))
})

it('out-of-range recommendation rowIndex renders without crash and without recommendation box', () => {
  render(<AkifScenarioCard card={{ ...card, recommendation: { rowIndex: 9, criterion: 'c', reason: 'r' } }} />)
  expect(screen.getByRole('table')).toBeInTheDocument()
  expect(screen.queryByText("Akif'in önerisi")).toBeNull()
})

it('empty rows renders without crash', () => {
  render(<AkifScenarioCard card={{ ...card, rows: [] }} />)
  expect(screen.getByRole('table', { name: 'Senaryo karşılaştırma' })).toBeInTheDocument()
  expect(screen.getByText(/Emsal alanı/)).toBeInTheDocument()
})
