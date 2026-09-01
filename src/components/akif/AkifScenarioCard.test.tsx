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
