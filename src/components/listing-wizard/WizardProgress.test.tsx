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

describe('WizardProgress — adım tamamlama mührü (Faz 2.5)', () => {
  it('tamamlanan adımın dairesi damga animasyonu için motion değerlerini taşımalı', () => {
    const { container } = render(<WizardProgress currentStep={3} />)
    const circles = container.querySelectorAll('[data-seal-state]')
    expect(circles.length).toBe(5)
    expect(circles[0].getAttribute('data-seal-state')).toBe('done')
    expect(circles[1].getAttribute('data-seal-state')).toBe('done')
    expect(circles[2].getAttribute('data-seal-state')).toBe('active')
    expect(circles[3].getAttribute('data-seal-state')).toBe('idle')
  })

  it('ilk adımda hiçbir daire done durumunda olmamalı', () => {
    const { container } = render(<WizardProgress currentStep={1} />)
    const states = Array.from(container.querySelectorAll('[data-seal-state]'))
      .map((el) => el.getAttribute('data-seal-state'))
    expect(states).not.toContain('done')
    expect(states[0]).toBe('active')
  })
})
