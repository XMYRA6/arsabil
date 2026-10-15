// Giriş sonrası `next` yönlendirmesi için açık-yönlendirme (open redirect) koruması.
export function safeRedirectPath(raw: string | null | undefined, fallback = '/'): string {
  if (!raw || raw.length > 500) return fallback
  if (!raw.startsWith('/')) return fallback
  if (raw.startsWith('//') || raw.startsWith('/\\')) return fallback
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(raw)) return fallback
  return raw
}
