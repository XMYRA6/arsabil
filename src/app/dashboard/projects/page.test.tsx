/** @jest-environment jsdom */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

jest.mock('next-auth/react', () => ({ useSession: jest.fn() }))
import { useSession } from 'next-auth/react'

const toastSuccess = jest.fn()
const toastError = jest.fn()
jest.mock('react-hot-toast', () => ({
    toast: {
        success: (...a: unknown[]) => toastSuccess(...a),
        error: (...a: unknown[]) => toastError(...a),
    },
}))

jest.mock('@/lib/export/excel', () => ({ exportToExcel: jest.fn() }))
jest.mock('@/components/ScenarioCompare', () => ({
    ScenarioCompare: () => <div>ScenarioCompare</div>,
}))

import ProjectsPage from './page'

const PROJECT_WITH_MEMORY = {
    id: 'p1',
    name: 'Trabzon Arsa',
    _count: { scenarios: 1 },
    scenarios: [],
    akifMemory: 'Bütçe üst sınırı 5M TL, deprem riskine çok önem veriyor.',
}

const PROJECT_WITHOUT_MEMORY = {
    id: 'p2',
    name: 'Ordu Arsa',
    _count: { scenarios: 0 },
    scenarios: [],
    akifMemory: null,
}

beforeEach(() => {
    ;(useSession as jest.Mock).mockReturnValue({ status: 'authenticated' })
    toastSuccess.mockReset()
    toastError.mockReset()
})

it('akifMemory varsa "Hatırladıkları" bloğu + Temizle butonu görünür', async () => {
    global.fetch = jest
        .fn()
        .mockResolvedValue({ ok: true, json: async () => ({ projects: [PROJECT_WITH_MEMORY] }) }) as jest.Mock
    render(<ProjectsPage />)
    await waitFor(() => expect(screen.getByText(/Hatırladıkları/)).toBeInTheDocument())
    expect(screen.getByText(/Bütçe üst sınırı 5M TL/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Temizle' })).toBeInTheDocument()
})

it('akifMemory yoksa blok hiç render edilmez', async () => {
    global.fetch = jest
        .fn()
        .mockResolvedValue({ ok: true, json: async () => ({ projects: [PROJECT_WITHOUT_MEMORY] }) }) as jest.Mock
    render(<ProjectsPage />)
    await waitFor(() => expect(screen.getByText('Ordu Arsa')).toBeInTheDocument())
    expect(screen.queryByText(/Hatırladıkları/)).not.toBeInTheDocument()
})

it('Temizle -> PATCH /api/projects/:id, başarıyla blok kaybolur + başarı toast\'ı', async () => {
    const fetchMock = jest
        .fn()
        .mockResolvedValueOnce({ ok: true, json: async () => ({ projects: [PROJECT_WITH_MEMORY] }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) })
    global.fetch = fetchMock as unknown as jest.Mock
    render(<ProjectsPage />)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Temizle' })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Temizle' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    expect(fetchMock.mock.calls[1][0]).toBe('/api/projects/p1')
    expect(fetchMock.mock.calls[1][1]).toMatchObject({
        method: 'PATCH',
        body: JSON.stringify({ action: 'clear_memory' }),
    })
    await waitFor(() => expect(screen.queryByText(/Hatırladıkları/)).not.toBeInTheDocument())
    expect(toastSuccess).toHaveBeenCalled()
})

it('Temizle başarısız -> blok kalır + hata toast\'ı', async () => {
    const fetchMock = jest
        .fn()
        .mockResolvedValueOnce({ ok: true, json: async () => ({ projects: [PROJECT_WITH_MEMORY] }) })
        .mockResolvedValueOnce({ ok: false, json: async () => ({}) })
    global.fetch = fetchMock as unknown as jest.Mock
    render(<ProjectsPage />)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Temizle' })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Temizle' }))
    await waitFor(() => expect(toastError).toHaveBeenCalled())
    expect(screen.getByText(/Hatırladıkları/)).toBeInTheDocument()
})
