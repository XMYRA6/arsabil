import fs from 'fs'
import path from 'path'
import { parseInbound } from '../parseInbound'

const fx = (n: string) =>
  JSON.parse(fs.readFileSync(path.join(__dirname, '..', '__fixtures__', n), 'utf8'))

describe('parseInbound', () => {
  it('tek text mesajı çıkarır', () => {
    const r = parseInbound(fx('inbound-text.json'))
    expect(r).toEqual([{
      from: '905321234567',
      text: 'Trabzon Ortahisar Uğurlu 123/45',
      messageId: 'wamid.AAA',
      timestamp: 1717000000,
      type: 'text',
    }])
  })
  it('image mesajı type:other olarak işaretler, text boş', () => {
    const r = parseInbound(fx('inbound-image.json'))
    expect(r).toHaveLength(1)
    expect(r[0].type).toBe('other')
    expect(r[0].text).toBe('')
    expect(r[0].messageId).toBe('wamid.IMG')
  })
  it('status callback → boş dizi', () => {
    expect(parseInbound(fx('inbound-status.json'))).toEqual([])
  })
  it('çoklu entry + telefon normalize (+ öneki atılır)', () => {
    const r = parseInbound(fx('inbound-multi.json'))
    expect(r.map(m => m.from)).toEqual(['905321111111', '905322222222'])
    expect(r.map(m => m.messageId)).toEqual(['wamid.M1', 'wamid.M2'])
  })
  it('tanınmayan/eksik payload → boş dizi (throw etmez)', () => {
    expect(parseInbound({})).toEqual([])
    expect(parseInbound(null)).toEqual([])
    expect(parseInbound({ entry: 'x' })).toEqual([])
  })
})
