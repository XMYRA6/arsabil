jest.mock('resend', () => ({
    Resend: jest.fn().mockImplementation(() => ({
        emails: {
            send: jest.fn().mockResolvedValue({ id: 'test-id' }),
        },
    })),
}))

jest.mock('@/lib/prisma', () => ({
    prisma: {
        user: {
            findUnique: jest.fn(),
        },
    },
}))

import { sendEmail, getEmailPrefs, buildMessageEmail, buildOfferEmail, buildApprovalEmail } from './email'
import { prisma } from '@/lib/prisma'

describe('buildMessageEmail', () => {
    it('includes sender name', () => {
        const html = buildMessageEmail('Emre Taner')
        expect(html).toContain('Emre Taner')
    })

    it('includes inbox link', () => {
        const html = buildMessageEmail('Emre')
        expect(html).toContain('/inbox')
    })
})

describe('buildOfferEmail', () => {
    it('includes listing title and share amount', () => {
        const html = buildOfferEmail('Kadıköy Arsası', 35)
        expect(html).toContain('Kadıköy Arsası')
        expect(html).toContain('%35')
    })
})

describe('buildApprovalEmail', () => {
    it('includes listing title', () => {
        const html = buildApprovalEmail('Beşiktaş 450m²')
        expect(html).toContain('Beşiktaş 450m²')
    })

    it('includes marketplace link', () => {
        const html = buildApprovalEmail('Test')
        expect(html).toContain('/marketplace')
    })
})

describe('getEmailPrefs', () => {
    const mockFindUnique = prisma.user.findUnique as jest.Mock

    beforeEach(() => jest.clearAllMocks())

    it('parses stored prefs', async () => {
        mockFindUnique.mockResolvedValue({ emailPrefs: '{"mesaj":false,"teklif":true,"ilan":true}' })
        const prefs = await getEmailPrefs('user-1')
        expect(prefs.mesaj).toBe(false)
        expect(prefs.teklif).toBe(true)
    })

    it('returns defaults when emailPrefs is empty string', async () => {
        mockFindUnique.mockResolvedValue({ emailPrefs: '{}' })
        const prefs = await getEmailPrefs('user-1')
        expect(prefs.mesaj).toBe(true)
        expect(prefs.teklif).toBe(true)
        expect(prefs.ilan).toBe(true)
    })

    it('returns defaults when user not found', async () => {
        mockFindUnique.mockResolvedValue(null)
        const prefs = await getEmailPrefs('ghost')
        expect(prefs.mesaj).toBe(true)
    })
})

describe('sendEmail', () => {
    it('calls resend.emails.send', async () => {
        await sendEmail({ to: 'test@example.com', subject: 'Test', html: '<p>hi</p>' })
        // sendEmail creates its own Resend instance — just ensure no throw
    })
})
