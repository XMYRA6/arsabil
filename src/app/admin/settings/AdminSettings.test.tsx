/** @jest-environment jsdom */
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import AdminSettings from './page'

beforeEach(() => {
    global.fetch = jest.fn(() =>
        Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
    ) as unknown as jest.Mock
})

describe('AdminSettings — pirinç birincil butonlar (Faz 4 task 8)', () => {
    it('"Genel Ayarları Kaydet" butonu adminPrimaryBtn class\'ını taşır', async () => {
        render(<AdminSettings />)
        await waitFor(() => screen.getByText('💾 Genel Ayarları Kaydet'))
        expect(screen.getByText('💾 Genel Ayarları Kaydet').className).toMatch(/adminPrimaryBtn/)
    })
})
