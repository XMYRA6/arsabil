/** @jest-environment jsdom */
import { renderHook, act } from '@testing-library/react'
import { useConversations } from './useConversations'

const mk = (id: string) => ({ id, title: id, projectId: null, lastMessageAt: '2026-10-24T00:00:00Z' })
let fetchMock: jest.Mock

beforeEach(() => {
  jest.useFakeTimers()
  fetchMock = jest.fn(async (url: string, init?: RequestInit) => {
    if (init?.method === 'DELETE' || init?.method === 'PATCH') return { ok: true, status: 204, json: async () => ({}) }
    return { ok: true, status: 200, json: async () => ({ items: [mk('a'), mk('b')], nextCursor: null }) }
  })
  ;(global as any).fetch = fetchMock
})
afterEach(() => jest.useRealTimers())

describe('useConversations', () => {
  it('enabled=false iken istek yok', async () => {
    const { result } = renderHook(() => useConversations(false))
    await act(async () => { jest.advanceTimersByTime(1000) })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(result.current.items).toEqual([])
  })

  it('setQ 250ms sonra tek istek atar', async () => {
    const { result } = renderHook(() => useConversations(true))
    await act(async () => { await Promise.resolve() })
    fetchMock.mockClear()
    act(() => { result.current.setQ('Işık') })
    await act(async () => { jest.advanceTimersByTime(200) })
    expect(fetchMock).not.toHaveBeenCalled()
    await act(async () => { jest.advanceTimersByTime(60) })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toContain('?q=I%C5%9F%C4%B1k')
  })

  it('remove listeden düşürür', async () => {
    const { result } = renderHook(() => useConversations(true))
    await act(async () => { await Promise.resolve() })
    expect(result.current.items.map((i) => i.id)).toEqual(['a', 'b'])
    await act(async () => { await result.current.remove('a') })
    expect(result.current.items.map((i) => i.id)).toEqual(['b'])
    expect(fetchMock).toHaveBeenCalledWith('/api/akif/conversations/a', expect.objectContaining({ method: 'DELETE' }))
  })
})
