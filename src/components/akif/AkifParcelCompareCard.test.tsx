/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import type { ParcelCompareCard } from '@/lib/ai/akif/contract'
import { AkifParcelCompareCard } from './AkifParcelCompareCard'

const member: ParcelCompareCard = {
  kind: 'parcel_compare',
  tier: 'member',
  rows: [
    { label: 'Oran 12/5', status: 'resolved', areaSqm: 900, rangeLow: 1000000, rangeHigh: 1200000, estimate: 1100000, pricePerSqm: 1222, confidence: 'yuksek' },
    { label: 'Oran 12/6', status: 'resolved', areaSqm: 800, rangeLow: 900000, rangeHigh: 1100000, estimate: 1000000, pricePerSqm: 1250, confidence: 'dusuk' },
  ],
  recommendation: { rowIndex: 1, criterion: 'en düşük m² fiyatı', reason: 'Daha uygun birim fiyat.' },
  note: 'Tahminler yaklaşıktır.',
}

it('shows recommended row highlighted with aria-current', () => {
  render(<AkifParcelCompareCard card={member} />)
  const row = screen.getAllByText('Oran 12/6')[0].closest('tr')!
  expect(row).toHaveAttribute('aria-current', 'true')
  expect(screen.getByText('Oran 12/5').closest('tr')).not.toHaveAttribute('aria-current')
  expect(screen.getByText('Önerilen')).toBeInTheDocument()
  expect(screen.getByText(/Ölçüt: en düşük m² fiyatı/)).toBeInTheDocument()
  expect(screen.getByText('Daha uygun birim fiyat.')).toBeInTheDocument()
  expect(screen.getByText('Tahminler yaklaşıktır.')).toBeInTheDocument()
  expect(screen.getByText('Yüksek')).toBeInTheDocument()
  expect(screen.getByText('Düşük')).toBeInTheDocument()
  expect(screen.getByText('1.100.000 ₺')).toBeInTheDocument()
})

it('free tier shows range and upgrade prompt and no estimate text', () => {
  render(
    <AkifParcelCompareCard
      card={{ ...member, tier: 'free', upgradeHint: true, recommendation: undefined, note: undefined }}
    />,
  )
  expect(screen.getByText(/1\.000\.000 ₺ – 1\.200\.000 ₺/)).toBeInTheDocument()
  expect(screen.queryByText('1.100.000 ₺')).toBeNull()
  expect(screen.queryByText('1.222 ₺')).toBeNull()
  expect(screen.queryByText('Yüksek')).toBeNull()
  expect(screen.queryByText('Tahmin')).toBeNull()
  expect(screen.getByRole('link', { name: /üye/i })).toHaveAttribute('href', '/register')
})

it('unresolved row shows status text', () => {
  render(
    <AkifParcelCompareCard
      card={{
        kind: 'parcel_compare',
        tier: 'member',
        rows: [
          { label: 'A', status: 'ambiguous', candidates: ['Oran, Çankaya', 'Oran, Sincan'] },
          { label: 'B', status: 'parcel_not_found' },
          { label: 'C', status: 'location_not_found' },
          { label: 'D', status: 'parcel_unavailable' },
        ],
      }}
    />,
  )
  expect(screen.getByText('Birden fazla eşleşme')).toBeInTheDocument()
  expect(screen.getByText('Oran, Sincan')).toBeInTheDocument()
  expect(screen.getAllByText('Parsel bulunamadı')).toHaveLength(2)
  expect(screen.getByText('Veri şu an alınamadı')).toBeInTheDocument()
})

it('table has an accessible name and column-scoped headers', () => {
  render(<AkifParcelCompareCard card={member} />)
  expect(screen.getByRole('table', { name: 'Parsel karşılaştırma' })).toBeInTheDocument()
  const headers = screen.getAllByRole('columnheader')
  expect(headers.length).toBeGreaterThan(0)
  headers.forEach((h) => expect(h).toHaveAttribute('scope', 'col'))
})

it('out-of-range recommendation rowIndex renders without crash and without recommendation box', () => {
  render(<AkifParcelCompareCard card={{ ...member, recommendation: { rowIndex: 9, criterion: 'c', reason: 'r' } }} />)
  expect(screen.getByRole('table')).toBeInTheDocument()
  expect(screen.queryByText("Akif'in önerisi")).toBeNull()
  expect(screen.queryByText('Önerilen')).toBeNull()
})

it('empty rows renders the table shell without crash', () => {
  render(<AkifParcelCompareCard card={{ kind: 'parcel_compare', tier: 'member', rows: [], note: 'Not.' }} />)
  expect(screen.getByRole('table', { name: 'Parsel karşılaştırma' })).toBeInTheDocument()
  expect(screen.getByText('Not.')).toBeInTheDocument()
})
