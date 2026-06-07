export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB
export const MAX_FILES_PER_LISTING = 10

export function isAllowedMimeType(mimeType: string): boolean {
    return (ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType)
}

export function isWithinSizeLimit(sizeBytes: number): boolean {
    return sizeBytes <= MAX_FILE_SIZE_BYTES
}

export function mimeToExtension(mimeType: string): string {
    const map: Record<string, string> = {
        'image/jpeg': 'jpg',
        'image/png':  'png',
        'image/webp': 'webp',
    }
    return map[mimeType] ?? 'jpg'
}
