import { getServerSession } from 'next-auth/next'
import { listConversations } from '@/lib/akif/chat/conversationStore'
import { GET } from './route'

jest.mock('next-auth/next', () => ({ getServerSession: jest.fn() }))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/akif/chat/conversationStore', () => ({
  ...jest.requireActual('@/lib/akif/chat/conversationStore'),
  getChatDb: jest.fn(() => ({ db: true })),
  listConversations: jest.fn(),
}))

const sess = getServerSession as jest.Mock
const list = listConversations as jest.Mock
beforeEach(() => jest.clearAllMocks())

describe('GET /api/akif/conversations', () => {
  it('oturumsuz 401', async () => {
    sess.mockResolvedValue(null)
    const res = await GET(new Request('http://x/api/akif/conversations'))
    expect(res.status).toBe(401)
  })
  it('q, cursor, take iletir', async () => {
    sess.mockResolvedValue({ user: { id: 'u1' } })
    list.mockResolvedValue({ items: [], nextCursor: null })
    const res = await GET(new Request('http://x/api/akif/conversations?q=arsa&cursor=c1&take=10'))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ items: [], nextCursor: null })
    expect(list).toHaveBeenCalledWith({ db: true }, { userId: 'u1', q: 'arsa', cursor: 'c1', take: 10 })
  })
  it('take sınırlanır', async () => {
    sess.mockResolvedValue({ user: { id: 'u1' } })
    list.mockResolvedValue({ items: [], nextCursor: null })
    await GET(new Request('http://x/api/akif/conversations?take=9999'))
    expect(list.mock.calls[0][1].take).toBe(50)
  })
})
