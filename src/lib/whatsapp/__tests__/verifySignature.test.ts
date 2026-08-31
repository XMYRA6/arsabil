import { createHmac } from 'crypto'
import { verifySignature } from '../verifySignature'

const SECRET = 'test_app_secret'
const BODY = '{"object":"whatsapp_business_account","entry":[]}'
function sig(body: string, secret = SECRET): string {
  return 'sha256=' + createHmac('sha256', secret).update(body).digest('hex')
}

describe('verifySignature', () => {
  it('geçerli imza true', () => {
    expect(verifySignature(BODY, SECRET, sig(BODY))).toBe(true)
  })
  it('gövde değişince false', () => {
    expect(verifySignature(BODY + ' ', SECRET, sig(BODY))).toBe(false)
  })
  it('yanlış secret false', () => {
    expect(verifySignature(BODY, SECRET, sig(BODY, 'other'))).toBe(false)
  })
  it('header null false', () => {
    expect(verifySignature(BODY, SECRET, null)).toBe(false)
  })
  it('header "sha256=" öneki yoksa false', () => {
    expect(verifySignature(BODY, SECRET, 'deadbeef')).toBe(false)
  })
  it('header hex olmayan çöp ise false (throw etmez)', () => {
    expect(verifySignature(BODY, SECRET, 'sha256=zzz')).toBe(false)
  })
})
