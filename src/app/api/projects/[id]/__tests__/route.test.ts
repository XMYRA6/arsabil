const getServerSessionMock = jest.fn()
const updateManyMock = jest.fn()

jest.mock('next-auth/next', () => ({
    getServerSession: (...args: unknown[]) => getServerSessionMock(...args),
}))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/prisma', () => ({
    prisma: {
        project: {
            updateMany: (...args: unknown[]) => updateManyMock(...args),
        },
    },
}))

import { PATCH } from '../route'

function patchReq(body: unknown) {
    return new Request('http://localhost/api/projects/p1', {
        method: 'PATCH',
        body: JSON.stringify(body),
    })
}

function ctx(id: string) {
    return { params: Promise.resolve({ id }) }
}

describe('PATCH /api/projects/[id]', () => {
    beforeEach(() => {
        getServerSessionMock.mockReset()
        updateManyMock.mockReset().mockResolvedValue({ count: 1 })
    })

    it('oturum yoksa 403 döner', async () => {
        getServerSessionMock.mockResolvedValue(null)
        const res = await PATCH(patchReq({ action: 'clear_memory' }), ctx('p1'))
        expect(res.status).toBe(403)
        expect(updateManyMock).not.toHaveBeenCalled()
    })

    it('action clear_memory değilse 400 döner', async () => {
        getServerSessionMock.mockResolvedValue({ user: { id: 'u1' } })
        const res = await PATCH(patchReq({ action: 'delete_everything' }), ctx('p1'))
        expect(res.status).toBe(400)
        expect(updateManyMock).not.toHaveBeenCalled()
    })

    it('sahiplik id+userId ile filtrelenir', async () => {
        getServerSessionMock.mockResolvedValue({ user: { id: 'u1' } })
        await PATCH(patchReq({ action: 'clear_memory' }), ctx('p1'))
        expect(updateManyMock).toHaveBeenCalledWith({
            where: { id: 'p1', userId: 'u1' },
            data: { akifMemory: null },
        })
    })

    it('başkasının projesi (count:0) -> 404', async () => {
        getServerSessionMock.mockResolvedValue({ user: { id: 'u1' } })
        updateManyMock.mockResolvedValue({ count: 0 })
        const res = await PATCH(patchReq({ action: 'clear_memory' }), ctx('p1'))
        expect(res.status).toBe(404)
    })

    it('başarı -> 200 { ok: true }', async () => {
        getServerSessionMock.mockResolvedValue({ user: { id: 'u1' } })
        const res = await PATCH(patchReq({ action: 'clear_memory' }), ctx('p1'))
        expect(res.status).toBe(200)
        expect(await res.json()).toEqual({ ok: true })
    })
})
