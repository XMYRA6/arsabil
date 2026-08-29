export interface BlockCheckInput {
  html: string
  httpStatus: number
  expectedSelector: string
  /** arama sayfasında bulunan ilan sayısı; detay sayfasında -1 verilip bu kontrol atlanır */
  foundListingCount: number
}

export interface BlockResult {
  blocked: boolean
  reason: string | null
}

const CHALLENGE_PATTERNS: Array<{ re: RegExp; reason: string }> = [
  { re: /just a moment|checking your browser|cf-browser-verification/i, reason: 'cloudflare challenge' },
  { re: /challenges\.cloudflare\.com/i, reason: 'cloudflare turnstile iframe' },
  { re: /px-captcha|_px3|perimeterx/i, reason: 'perimeterx/px captcha' },
  { re: /datadome/i, reason: 'datadome' },
  { re: /hcaptcha\.com|g-recaptcha/i, reason: 'captcha widget' },
  { re: /robot olmad[ıi]ğ[ıi]n[ıi]z[ıi] doğrula|robot musunuz|güvenlik doğrulaması/i, reason: 'tr bot doğrulama metni' },
]

export function detectBlock(input: BlockCheckInput): BlockResult {
  if (input.httpStatus === 403 || input.httpStatus === 429 || input.httpStatus >= 500) {
    return { blocked: true, reason: `http ${input.httpStatus}` }
  }
  for (const p of CHALLENGE_PATTERNS) {
    if (p.re.test(input.html)) return { blocked: true, reason: p.reason }
  }
  if (!input.html.includes(stripSelector(input.expectedSelector))) {
    return { blocked: true, reason: `beklenen konteyner yok: ${input.expectedSelector}` }
  }
  if (input.foundListingCount === 0) {
    return { blocked: true, reason: 'arama sayfasında 0 ilan (muhtemel soft-block)' }
  }
  return { blocked: false, reason: null }
}

/** '.results' / '#px' gibi seçiciden ham metni çıkarır (kaba içerik kontrolü için). */
function stripSelector(sel: string): string {
  return sel.replace(/^[.#]/, '')
}
