/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { WizardProgress } from './WizardProgress'

describe('WizardProgress', () => {
  it('5 adım etiketini render eder', () => {
    render(<WizardProgress currentStep={1} />)
    expect(screen.getByText('Konum')).toBeInTheDocument()
    expect(screen.getByText('Detay')).toBeInTheDocument()
    expect(screen.getByText('Fotoğraf')).toBeInTheDocument()
    expect(screen.getByText('Fizibilite')).toBeInTheDocument()
    expect(screen.getByText('Yayınla')).toBeInTheDocument()
  })

  it('mevcut adımdan önceki adımlar tamamlanmış (✓) gösterilir', () => {
    render(<WizardProgress currentStep={3} />)
    expect(screen.getAllByText('✓')).toHaveLength(2)
  })

  it('mevcut adım numarasını gösterir (tamamlanmamış adım metni ✓ değil)', () => {
    render(<WizardProgress currentStep={3} />)
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('ilk adımda hiçbir adım tamamlanmamış olmalı', () => {
    render(<WizardProgress currentStep={1} />)
    expect(screen.queryByText('✓')).not.toBeInTheDocument()
  })
})
