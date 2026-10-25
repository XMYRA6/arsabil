/** @jest-environment jsdom */
import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { AkifVoiceTranscript } from '../AkifVoiceTranscript'

describe('AkifVoiceTranscript', () => {
  it('kullanıcı ve Akif metinlerini gösterir', () => {
    render(
      <AkifVoiceTranscript
        items={[
          { id: '1', role: 'user', text: '900 metrekare arsam var' },
          { id: '2', role: 'akif', text: 'Tamam, emsali de söyle.' },
        ]}
      />,
    )
    expect(screen.getByText('900 metrekare arsam var')).toBeInTheDocument()
    expect(screen.getByText('Tamam, emsali de söyle.')).toBeInTheDocument()
  })

  it('term kartı render eder', () => {
    render(
      <AkifVoiceTranscript
        items={[{ id: '1', role: 'akif', text: '', card: { kind: 'term', term: 'emsal', shortDef: 'yapılaşma oranı', example: 'örnek' } }]}
      />,
    )
    expect(screen.getByText('emsal')).toBeInTheDocument()
    expect(screen.getByText(/yapılaşma oranı/)).toBeInTheDocument()
  })

  it('senaryo kartı render eder', () => {
    render(
      <AkifVoiceTranscript
        items={[{
          id: '1', role: 'akif', text: '',
          card: {
            kind: 'contractor_offers',
            rows: [{ label: 'Müteahhit %50', arsaPayiX: 0.5, arsaSahibiDaireSayisi: 3, arsaSahibiDegeriTL: 1000000, daireSatisFiyatiTL: 2000000 }],
            defaultsUsed: [], assumptions: [], emsalNote: '',
          },
        }]}
      />,
    )
    expect(screen.getByText(/Müteahhit %50/)).toBeInTheDocument()
  })

  it('boş metinli düz item render etmez (yalnız kart taşıyanlar)', () => {
    const { container } = render(
      <AkifVoiceTranscript items={[{ id: '1', role: 'akif', text: '' }]} />,
    )
    expect(container.textContent).toBe('')
  })

  it('voice transcript renders parcel_compare card', () => {
    render(
      <AkifVoiceTranscript
        items={[{
          id: '1', role: 'akif', text: '',
          card: { kind: 'parcel_compare', tier: 'member', rows: [{ label: 'Oran 12/5', status: 'parcel_not_found' }] },
        }]}
      />,
    )
    expect(screen.getByText('Oran 12/5')).toBeInTheDocument()
    expect(screen.getByText('Parsel bulunamadı')).toBeInTheDocument()
  })
})
