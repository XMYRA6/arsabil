/** @jest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { WizardShell } from './WizardShell'

const back = jest.fn()
const push = jest.fn()
jest.mock('next/navigation', () => ({ useRouter: () => ({ back, push }) }))

describe('WizardShell', () => {
  beforeEach(() => { back.mockClear(); push.mockClear() })

  it('stepTitle metnini render eder (AppBar başlığı + kart h2)', () => {
    render(
      <WizardShell pageTitle="Yeni İlan Oluştur" stepTitle="Konum Bilgisi" step={1} onNext={() => {}} nextDisabled={false}>
        <div>STEP-CONTENT</div>
      </WizardShell>
    )
    expect(screen.getAllByText('Konum Bilgisi').length).toBeGreaterThan(0)
  })

  it('children içeriğini render eder', () => {
    render(
      <WizardShell pageTitle="X" stepTitle="Y" step={1} onNext={() => {}} nextDisabled={false}>
        <div>STEP-CONTENT</div>
      </WizardShell>
    )
    expect(screen.getByText('STEP-CONTENT')).toBeInTheDocument()
  })

  it('onBack verilmezse hiçbir geri butonu render etmez (1. adım)', () => {
    render(
      <WizardShell pageTitle="X" stepTitle="Y" step={1} onNext={() => {}} nextDisabled={false}>
        {null}
      </WizardShell>
    )
    expect(screen.queryByRole('button', { name: '← Geri' })).not.toBeInTheDocument()
  })

  it('onBack verilirse tıklanınca çağırır (masaüstü VE mobil sticky butonu)', () => {
    const onBack = jest.fn()
    render(
      <WizardShell pageTitle="X" stepTitle="Y" step={2} onBack={onBack} onNext={() => {}} nextDisabled={false}>
        {null}
      </WizardShell>
    )
    const btns = screen.getAllByRole('button', { name: '← Geri' })
    expect(btns.length).toBeGreaterThanOrEqual(2)
    fireEvent.click(btns[0])
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('onNext verilmezse ileri butonu render etmez (son adım)', () => {
    render(
      <WizardShell pageTitle="X" stepTitle="Y" step={5} onBack={() => {}}>
        {null}
      </WizardShell>
    )
    expect(screen.queryByRole('button', { name: 'İleri →' })).not.toBeInTheDocument()
  })

  it('nextDisabled true iken ileri butonları disabled olur', () => {
    render(
      <WizardShell pageTitle="X" stepTitle="Y" step={1} onNext={() => {}} nextDisabled>
        {null}
      </WizardShell>
    )
    const btns = screen.getAllByRole('button', { name: 'İleri →' })
    expect(btns.length).toBeGreaterThan(0)
    btns.forEach(btn => expect(btn).toBeDisabled())
  })
})
