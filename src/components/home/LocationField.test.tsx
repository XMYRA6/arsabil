/** @jest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { LocationField, norm, type LocationValue } from './LocationField'

function Kutu({ onValue }: { onValue?: (v: LocationValue) => void }) {
  const [v, setV] = useState<LocationValue>({ il: '', ilce: '' })
  return <LocationField value={v} onChange={(x) => { setV(x); onValue?.(x) }} />
}

beforeEach(() => {
  global.fetch = jest.fn(async (url: string) => {
    if (url.startsWith('/api/tkgm/il?') || url.startsWith('/api/tkgm/ilce')) {
      return { ok: true, json: async () => ({ ilceler: [{ id: 11, text: 'Akçaabat' }, { id: 12, text: 'Ortahisar' }] }) }
    }
    if (url.startsWith('/api/tkgm/il')) {
      return { ok: true, json: async () => ({ iller: [{ id: 61, text: 'Trabzon' }, { id: 6, text: 'Ankara' }, { id: 34, text: 'İstanbul' }] }) }
    }
    return { ok: true, json: async () => ({ status: 'verified', parcel: { il: 'Ankara', ilce: 'Çankaya' } }) }
  }) as unknown as typeof fetch
})

describe('LocationField', () => {
  it('norm Türkçe harflere duyarsız', () => {
    expect(norm('İstanbul')).toBe('istanbul')
    expect(norm('ığdır')).toBe('igdir')
  })
  it('il yazınca öneri gelir, il sonra ilçe seçilir', async () => {
    const onValue = jest.fn()
    render(<Kutu onValue={onValue} />)
    const input = screen.getByRole('combobox')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'trab' } })
    fireEvent.mouseDown(await screen.findByRole('option', { name: 'Trabzon' }))
    expect(onValue).toHaveBeenLastCalledWith({ il: 'Trabzon', ilce: '' })
    fireEvent.mouseDown(await screen.findByRole('option', { name: 'Akçaabat' }))
    expect(onValue).toHaveBeenLastCalledWith({ il: 'Trabzon', ilce: 'Akçaabat' })
    expect(screen.getByText('Trabzon · Akçaabat')).toBeInTheDocument()
  })
  it('"Türkçe i" ile istanbul bulunur', async () => {
    render(<Kutu />)
    const input = screen.getByRole('combobox')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'istan' } })
    expect(await screen.findByRole('option', { name: 'İstanbul' })).toBeInTheDocument()
  })
  it('konumumu kullan: koordinattan il ve ilçe doldurur', async () => {
    Object.defineProperty(global.navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition: (ok: (p: unknown) => void) => ok({ coords: { latitude: 39.9, longitude: 32.8 } }) },
    })
    const onValue = jest.fn()
    render(<Kutu onValue={onValue} />)
    fireEvent.click(screen.getByRole('button', { name: 'Konumumu kullan' }))
    await waitFor(() => expect(onValue).toHaveBeenCalledWith({ il: 'Ankara', ilce: 'Çankaya' }))
  })
  it('konum izni reddedilirse mesaj gösterir', async () => {
    Object.defineProperty(global.navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition: (_ok: unknown, err: () => void) => err() },
    })
    render(<Kutu />)
    fireEvent.click(screen.getByRole('button', { name: 'Konumumu kullan' }))
    expect(await screen.findByText('Konum izni alınamadı.')).toBeInTheDocument()
  })
})
