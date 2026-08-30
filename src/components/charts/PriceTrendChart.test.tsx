/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

jest.mock('react-chartjs-2', () => ({
  Line: (props: { data: { datasets: Array<{ data: number[] }>; labels: string[] } }) => (
    <div
      data-testid="line"
      data-values={JSON.stringify(props.data.datasets[0].data)}
      data-labels={JSON.stringify(props.data.labels)}
    />
  ),
}))
import { PriceTrendChart } from './PriceTrendChart'

const POINTS = [
  { month: '2026-06', medianPricePerSqm: 1000, sampleCount: 10 },
  { month: '2026-07', medianPricePerSqm: 1100, sampleCount: 10 },
  { month: '2026-08', medianPricePerSqm: 1200, sampleCount: 10 },
]

it('points → dataset + kısa TR ay etiketleri', () => {
  render(<PriceTrendChart points={POINTS} changePct3m={null} />)
  const line = screen.getByTestId('line')
  expect(JSON.parse(line.getAttribute('data-values')!)).toEqual([1000, 1100, 1200])
  expect(JSON.parse(line.getAttribute('data-labels')!)).toEqual(["Haz '26", "Tem '26", "Ağu '26"])
})

it('changePct3m pozitif → yeşil özet', () => {
  render(<PriceTrendChart points={POINTS} changePct3m={12.5} />)
  expect(screen.getByText(/Son 3 ay/)).toHaveTextContent('+%12,5')
})

it('changePct3m null → özet gizli', () => {
  render(<PriceTrendChart points={POINTS} changePct3m={null} />)
  expect(screen.queryByText(/Son 3 ay/)).not.toBeInTheDocument()
})

it('thinTrend → uyarı', () => {
  render(<PriceTrendChart points={POINTS} changePct3m={null} thinTrend />)
  expect(screen.getByText(/sınırlı geçmiş veriye/i)).toBeInTheDocument()
})
