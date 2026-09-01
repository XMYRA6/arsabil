/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { AkifMessageBubble } from './AkifMessageBubble'

it('kullanıcı balonu içerik ve rol', () => {
  render(<AkifMessageBubble role="user" content="900 m² arsam var" />)
  const el = screen.getByText('900 m² arsam var')
  expect(el.closest('[data-role]')).toHaveAttribute('data-role', 'user')
})

it('akif balonu rol', () => {
  render(<AkifMessageBubble role="akif" content="Anladım." />)
  expect(screen.getByText('Anladım.').closest('[data-role]')).toHaveAttribute('data-role', 'akif')
})

it('satır sonlarını korur (pre-wrap)', () => {
  render(<AkifMessageBubble role="akif" content={'satır1\nsatır2'} />)
  const bubble = screen.getByText(/satır1/).closest('[data-role]') as HTMLElement
  expect(bubble).toHaveTextContent('satır1 satır2')
})
