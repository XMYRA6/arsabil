/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { StudioRenderHookBox } from './StudioRenderHookBox'

it('başlık + demo görsel + /hesapla linki render eder', () => {
  render(<StudioRenderHookBox />)
  expect(screen.getByText(/fotoğraf gibi gör/i)).toBeInTheDocument()
  expect(screen.getByAltText(/fotogerçekçi bina görseli örneği/i)).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /Studio'yu Dene/i })).toHaveAttribute('href', '/hesapla')
})
