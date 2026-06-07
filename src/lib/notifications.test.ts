import { getNotificationUrl, getNotificationIcon } from './notifications'

describe('getNotificationUrl', () => {
    it('MESAJ_VAR → /inbox?with=entityId', () =>
        expect(getNotificationUrl('MESAJ_VAR', 'abc')).toBe('/inbox?with=abc'))
    it('TEKLIF_GELDI → /listing/entityId', () =>
        expect(getNotificationUrl('TEKLIF_GELDI', 'xyz')).toBe('/listing/xyz'))
    it('ILAN_ONAYLANDI → /listing/entityId', () =>
        expect(getNotificationUrl('ILAN_ONAYLANDI', 'xyz')).toBe('/listing/xyz'))
    it('ILAN_REDDEDILDI → /listing/entityId', () =>
        expect(getNotificationUrl('ILAN_REDDEDILDI', 'xyz')).toBe('/listing/xyz'))
    it('entityId yoksa boş string', () =>
        expect(getNotificationUrl('MESAJ_VAR', '')).toBe(''))
    it('bilinmeyen tip → boş string', () =>
        expect(getNotificationUrl('BILINMEYEN', 'abc')).toBe(''))
})

describe('getNotificationIcon', () => {
    it('MESAJ_VAR → 💬', () => expect(getNotificationIcon('MESAJ_VAR')).toBe('💬'))
    it('TEKLIF_GELDI → 🏷️', () => expect(getNotificationIcon('TEKLIF_GELDI')).toBe('🏷️'))
    it('ILAN_ONAYLANDI → ✅', () => expect(getNotificationIcon('ILAN_ONAYLANDI')).toBe('✅'))
    it('ILAN_REDDEDILDI → ❌', () => expect(getNotificationIcon('ILAN_REDDEDILDI')).toBe('❌'))
    it('bilinmeyen tip → 🔔', () => expect(getNotificationIcon('BILINMEYEN')).toBe('🔔'))
})
