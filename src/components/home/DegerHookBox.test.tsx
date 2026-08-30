/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { DegerHookBox } from './DegerHookBox'

it('başlık + /deger linki render eder', () => {
  render(<DegerHookBox />)
  expect(screen.getByText(/Arsanın değeri ne kadar/i)).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /Değeri Öğren/i })).toHaveAttribute('href', '/deger')
})
