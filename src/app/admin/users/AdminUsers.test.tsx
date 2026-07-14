/** @jest-environment jsdom */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import AdminUsers from './page'

const mockUser = {
    id: 'user-1',
    name: 'Ayşe Yılmaz',
    email: 'ayse@test.com',
    role: 'USER',
    plan: 'FREE',
    isVerified: false,
    isBanned: false,
    createdAt: '2026-01-15T00:00:00.000Z',
    _count: { reports: 2, listings: 1, offers: 0 },
}

beforeEach(() => {
    global.fetch = jest.fn((url: string, opts?: RequestInit) => {
        if (!opts || opts.method === undefined) {
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ users: [mockUser] }),
            }) as unknown as Promise<Response>
        }
        return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({}),
        }) as unknown as Promise<Response>
    }) as jest.Mock
})

describe('AdminUsers — mobil DataCard görünümü', () => {
    it('kullanıcı adı hem masaüstü tabloda hem mobil kartta render edilir (2 kopya)', async () => {
        render(<AdminUsers />)
        await waitFor(() => expect(screen.getAllByText('Ayşe Yılmaz')).toHaveLength(2))
        expect(screen.getAllByText('ayse@test.com').length).toBeGreaterThan(0)
    })

    it('mobil karttaki askıya al butonu tıklanınca PATCH isteği isBanned:true ile atılır', async () => {
        window.confirm = jest.fn(() => true)
        render(<AdminUsers />)
        await waitFor(() => expect(screen.getAllByText('Ayşe Yılmaz').length).toBeGreaterThan(0))

        const banButtons = screen.getAllByTitle('Askıya Al')
        fireEvent.click(banButtons[banButtons.length - 1])

        await waitFor(() => {
            const calls = (global.fetch as jest.Mock).mock.calls
            const patchCall = calls.find(c => c[1]?.method === 'PATCH' && JSON.parse(c[1].body).isBanned === true)
            expect(patchCall).toBeDefined()
        })
    })
})
