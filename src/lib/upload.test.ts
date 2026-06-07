import {
    isAllowedMimeType,
    isWithinSizeLimit,
    mimeToExtension,
    MAX_FILE_SIZE_BYTES,
} from './upload'

describe('isAllowedMimeType', () => {
    it('kabul: image/jpeg', () => expect(isAllowedMimeType('image/jpeg')).toBe(true))
    it('kabul: image/png',  () => expect(isAllowedMimeType('image/png')).toBe(true))
    it('kabul: image/webp', () => expect(isAllowedMimeType('image/webp')).toBe(true))
    it('red: image/gif',    () => expect(isAllowedMimeType('image/gif')).toBe(false))
    it('red: application/pdf', () => expect(isAllowedMimeType('application/pdf')).toBe(false))
    it('red: boş string',  () => expect(isAllowedMimeType('')).toBe(false))
})

describe('isWithinSizeLimit', () => {
    it('5MB tam limitinde kabul', () => expect(isWithinSizeLimit(MAX_FILE_SIZE_BYTES)).toBe(true))
    it('1KB kabul',              () => expect(isWithinSizeLimit(1024)).toBe(true))
    it('5MB+1 byte red',         () => expect(isWithinSizeLimit(MAX_FILE_SIZE_BYTES + 1)).toBe(false))
})

describe('mimeToExtension', () => {
    it('jpeg → jpg',  () => expect(mimeToExtension('image/jpeg')).toBe('jpg'))
    it('png  → png',  () => expect(mimeToExtension('image/png')).toBe('png'))
    it('webp → webp', () => expect(mimeToExtension('image/webp')).toBe('webp'))
    it('bilinmeyen → jpg', () => expect(mimeToExtension('image/tiff')).toBe('jpg'))
})
