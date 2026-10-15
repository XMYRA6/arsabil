const getServerSessionMock = jest.fn()
const findManyMock = jest.fn()
jest.mock('next-auth/next', () => ({ getServerSession: (...a: unknown[]) => getServerSessionMock(...a) }))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/prisma', () => ({ prisma: { projeKarti: { findMany: (...a: unknown[]) => findManyMock(...a) } } }))

import { GET } from '../route'

beforeEach(() => jest.clearAllMocks())

describe('GET /api/akif/projeler', () => {
  it('oturum yoksa 401', async () => {
    getServerSessionMock.mockResolvedValue(null)
    expect((await GET()).status).toBe(401)
    expect(findManyMock).not.toHaveBeenCalled()
  })

  it('yalnız oturum sahibinin projelerini döner ve parselleri metne çevirir', async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: 'u1' } })
    findManyMock.mockResolvedValue([
      {
        id: 'pk1',
        name: 'Maçka',
        inputs: { arsaAlani: 850 },
        createdAt: new Date('2026-10-15T10:00:00Z'),
        updatedAt: new Date('2026-10-16T10:00:00Z'),
        parseller: [{ parselDosyasi: { il: 'TRABZON', ilce: 'ORTAHISAR', mahalle: 'UĞURLU', ada: '123', parsel: '45' } }],
        revizyonlar: [{ field: 'arsaAlani', oldValue: 800, newValue: 850, changedAt: new Date('2026-10-16T10:00:00Z'), channel: 'whatsapp' }],
      },
    ])
    const res = await GET()
    expect(res.status).toBe(200)
    expect(findManyMock.mock.calls[0][0].where).toEqual({ userId: 'u1' })
    expect(findManyMock.mock.calls[0][0].take).toBe(50)
    const body = await res.json()
    expect(body.projects[0]).toMatchObject({
      id: 'pk1',
      name: 'Maçka',
      parcels: ['TRABZON/ORTAHISAR/UĞURLU ada 123 parsel 45'],
    })
    expect(body.projects[0].revisions[0]).toMatchObject({ field: 'arsaAlani', oldValue: 800, newValue: 850 })
  })
})
