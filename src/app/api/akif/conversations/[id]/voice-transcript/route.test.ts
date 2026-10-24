import { getServerSession } from 'next-auth/next'
import { saveVoiceTranscript, ConversationOwnershipError } from '@/lib/akif/chat/conversationStore'
import { POST } from './route'

jest.mock('next-auth/next', () => ({ getServerSession: jest.fn() }))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/akif/chat/conversationStore', () => ({
  ...jest.requireActual('@/lib/akif/chat/conversationStore'),
  getChatDb: jest.fn(() => ({ db: true })),
  saveVoiceTranscript: jest.fn(),
}))

const sess = getServerSession as jest.Mock
const save = saveVoiceTranscript as jest.Mock
const ctx = { params: Promise.resolve({ id: 'c1' }) }
const req = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })
const item = (i = 1) => ({ id: `m${i}`, role: 'user', text: 'merhaba' })
beforeEach(() => {
  jest.clearAllMocks()
  sess.mockResolvedValue({ user: { id: 'u1' } })
})

describe('POST voice-transcript', () => {
  it('oturumsuz 401', async () => {
    sess.mockResolvedValue(null)
    expect((await POST(req({ items: [item()] }), ctx)).status).toBe(401)
  })
  it('geçerli -> { saved }, projectId yalnız string ise geçer', async () => {
    save.mockResolvedValue({ saved: 1 })
    const res = await POST(req({ items: [item()], projectId: 'p1' }), ctx)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ saved: 1 })
    expect(save).toHaveBeenCalledWith({ db: true }, { userId: 'u1', conversationId: 'c1', items: [item()], projectId: 'p1' })
    await POST(req({ items: [item()], projectId: 5 }), ctx)
    expect(save.mock.calls[1][1]).not.toHaveProperty('projectId')
  })
  it('ConversationOwnershipError -> 409', async () => {
    save.mockRejectedValue(new ConversationOwnershipError())
    expect((await POST(req({ items: [item()] }), ctx)).status).toBe(409)
  })
  it('diğer hata yeniden fırlatılır', async () => {
    save.mockRejectedValue(new Error('boom'))
    await expect(POST(req({ items: [item()] }), ctx)).rejects.toThrow('boom')
  })
  it('201 öğe -> 400', async () => {
    const items = Array.from({ length: 201 }, (_, i) => item(i))
    expect((await POST(req({ items }), ctx)).status).toBe(400)
    expect(save).not.toHaveBeenCalled()
  })
  it('geçersiz öğeler -> 400', async () => {
    const bad = [
      { items: 'x' },
      { items: [{ ...item(), id: '' }] },
      { items: [{ role: 'user', text: 'a' }] },
      { items: [{ ...item(), role: 'bot' }] },
      { items: [{ ...item(), text: '' }] },
      { items: [{ ...item(), text: 'a'.repeat(4001) }] },
      { items: [null] },
    ]
    for (const b of bad) expect((await POST(req(b), ctx)).status).toBe(400)
    expect((await POST(new Request('http://x', { method: 'POST', body: 'nope' }), ctx)).status).toBe(400)
    expect(save).not.toHaveBeenCalled()
  })
})
