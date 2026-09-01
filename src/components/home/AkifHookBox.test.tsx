/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { AkifHookBox } from './AkifHookBox'

it('başlık + /akif linki', () => {
  render(<AkifHookBox />)
  expect(screen.getByRole('heading', { name: /Akif Usta/i })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /sor/i })).toHaveAttribute('href', '/akif')
})
