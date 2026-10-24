import { getServerSession } from 'next-auth/next'
import { getConversation, renameConversation, deleteConversation } from '@/lib/akif/chat/conversationStore'
import { GET, PATCH, DELETE } from './route'

jest.mock('next-auth/next', () => ({ getServerSession: jest.fn() }))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/akif/chat/conversationStore', () => ({
  ...jest.requireActual('@/lib/akif/chat/conversationStore'),
  getChatDb: jest.fn(() => ({ db: true })),
  getConversation: jest.fn(),
  renameConversation: jest.fn(),
  deleteConversation: jest.fn(),
}))

const sess = getServerSession as jest.Mock
const ctx = { params: Promise.resolve({ id: 'c1' }) }
const patchReq = (body: unknown) =>
  new Request('http://x/api/akif/conversations/c1', { method: 'PATCH', body: JSON.stringify(body) })
beforeEach(() => {
  jest.clearAllMocks()
  sess.mockResolvedValue({ user: { id: 'u1' } })
})

describe('/api/akif/conversations/[id]', () => {
  it('oturumsuz 401 (GET, PATCH, DELETE)', async () => {
    sess.mockResolvedValue(null)
    expect((await GET(new Request('http://x'), ctx)).status).toBe(401)
    expect((await PATCH(patchReq({ title: 'a' }), ctx)).status).toBe(401)
    expect((await DELETE(new Request('http://x'), ctx)).status).toBe(401)
  })
  it('GET store null -> 404', async () => {
    ;(getConversation as jest.Mock).mockResolvedValue(null)
    expect((await GET(new Request('http://x'), ctx)).status).toBe(404)
    expect(getConversation).toHaveBeenCalledWith({ db: true }, { userId: 'u1', id: 'c1' })
  })
  it('GET bulunursa 200', async () => {
    ;(getConversation as jest.Mock).mockResolvedValue({ conversation: { id: 'c1' }, messages: [] })
    const res = await GET(new Request('http://x'), ctx)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ conversation: { id: 'c1' }, messages: [] })
  })
  it('PATCH 121 karakter -> 400', async () => {
    expect((await PATCH(patchReq({ title: 'a'.repeat(121) }), ctx)).status).toBe(400)
    expect(renameConversation).not.toHaveBeenCalled()
  })
  it('PATCH boş / string olmayan / bozuk gövde -> 400', async () => {
    expect((await PATCH(patchReq({ title: '   ' }), ctx)).status).toBe(400)
    expect((await PATCH(patchReq({ title: 5 }), ctx)).status).toBe(400)
    const bad = new Request('http://x', { method: 'PATCH', body: 'nope' })
    expect((await PATCH(bad, ctx)).status).toBe(400)
  })
  it('PATCH geçerli -> 204, kullanıcı id ile', async () => {
    ;(renameConversation as jest.Mock).mockResolvedValue(true)
    const res = await PATCH(patchReq({ title: 'Yeni ad' }), ctx)
    expect(res.status).toBe(204)
    expect(renameConversation).toHaveBeenCalledWith({ db: true }, { userId: 'u1', id: 'c1', title: 'Yeni ad' })
  })
  it('PATCH başkasının -> 404', async () => {
    ;(renameConversation as jest.Mock).mockResolvedValue(false)
    expect((await PATCH(patchReq({ title: 'x' }), ctx)).status).toBe(404)
  })
  it('DELETE true -> 204, false -> 404', async () => {
    ;(deleteConversation as jest.Mock).mockResolvedValueOnce(true).mockResolvedValueOnce(false)
    expect((await DELETE(new Request('http://x'), ctx)).status).toBe(204)
    expect((await DELETE(new Request('http://x'), ctx)).status).toBe(404)
    expect(deleteConversation).toHaveBeenCalledWith({ db: true }, { userId: 'u1', id: 'c1' })
  })
})
