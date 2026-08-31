import { renderFollowup } from '../renderFollowup'

describe('renderFollowup', () => {
  it('prompt mahalle adı + "Evet" içerir', () => {
    const t = renderFollowup.prompt('Uğurlu')
    expect(t).toContain('Uğurlu')
    expect(t.toLowerCase()).toContain('evet')
    expect(t).toContain('takip')
  })
  it('subscribed onay + DURDUR ipucu', () => {
    expect(renderFollowup.subscribed('Uğurlu')).toContain('DURDUR')
  })
  it('unsubscribedAll / noSubscription', () => {
    expect(renderFollowup.unsubscribedAll()).toContain('durduruldu')
    expect(renderFollowup.noSubscription()).toContain('abone')
  })
})
