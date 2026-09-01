/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ProsePage } from './ProsePage'

it('başlık + içerik render eder', () => {
  render(
    <ProsePage title="İletişim">
      <p>Bize ulaşın.</p>
    </ProsePage>,
  )
  expect(screen.getByRole('heading', { name: 'İletişim' })).toBeInTheDocument()
  expect(screen.getByText('Bize ulaşın.')).toBeInTheDocument()
})

it('updated verilmezse "Son güncelleme" satırı görünmez', () => {
  render(
    <ProsePage title="X">
      <p>y</p>
    </ProsePage>,
  )
  expect(screen.queryByText(/Son güncelleme/)).not.toBeInTheDocument()
})

it('updated + draftNotice görünür', () => {
  render(
    <ProsePage title="X" updated="1 Eylül 2026" draftNotice="Bu bir taslaktır.">
      <p>y</p>
    </ProsePage>,
  )
  expect(screen.getByText(/Son güncelleme: 1 Eylül 2026/)).toBeInTheDocument()
  expect(screen.getByText('Bu bir taslaktır.')).toBeInTheDocument()
})
