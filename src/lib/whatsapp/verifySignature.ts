import { createHmac, timingSafeEqual } from 'crypto'

export function verifySignature(rawBody: string, secret: string, header: string | null): boolean {
  if (!header || !header.startsWith('sha256=')) return false
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex')
  const got = header.slice('sha256='.length)
  if (got.length !== expected.length) return false
  try {
    return timingSafeEqual(Buffer.from(got, 'hex'), Buffer.from(expected, 'hex'))
  } catch {
    return false
  }
}
