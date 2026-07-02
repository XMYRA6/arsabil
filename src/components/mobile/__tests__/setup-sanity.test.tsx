/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

test('jsdom ortamında JSX render edilebiliyor', () => {
    render(<button>Deneme</button>)
    expect(screen.getByRole('button', { name: 'Deneme' })).toBeInTheDocument()
})
