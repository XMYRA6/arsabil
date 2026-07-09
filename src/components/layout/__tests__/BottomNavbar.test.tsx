/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { BottomNavbar } from '../BottomNavbar'

let mockPathname = '/marketplace'
jest.mock('next/navigation', () => ({ usePathname: () => mockPathname }))

describe('BottomNavbar', () => {
  it('normal bir sayfada (marketplace) render edilir', () => {
    mockPathname = '/marketplace'
    render(<BottomNavbar />)
    expect(screen.getByRole('navigation')).toBeInTheDocument()
  })

  it('/login sayfasında render edilmez (auth öncesi, oturum gerektiren sekmeler anlamsız)', () => {
    mockPathname = '/login'
    render(<BottomNavbar />)
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
  })

  it('/register sayfasında render edilmez', () => {
    mockPathname = '/register'
    render(<BottomNavbar />)
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
  })
})
