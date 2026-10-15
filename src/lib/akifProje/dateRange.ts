// Akif-5c — Europe/Istanbul tarih aralığı. Türkiye 2016'dan beri sabit UTC+3
// (DST yok), bu yüzden sabit ofset doğrudur.

const TR_OFFSET_MS = 3 * 3_600_000
const DAY_MS = 86_400_000

export function istanbulDateString(d: Date): string {
  return new Date(d.getTime() + TR_OFFSET_MS).toISOString().slice(0, 10)
}

/** 'YYYY-MM-DD' → o günün TR başlangıcının UTC ms değeri; geçersizse null. */
function parseDay(s: unknown): number | null {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null
  const [y, m, d] = s.split('-').map(Number)
  const t = Date.UTC(y, m - 1, d)
  const chk = new Date(t)
  if (chk.getUTCFullYear() !== y || chk.getUTCMonth() !== m - 1 || chk.getUTCDate() !== d) return null
  return t - TR_OFFSET_MS
}

export type DateRangeResult =
  | { ok: true; range: { from: Date; toExclusive: Date } | null }
  | { ok: false; field: string; reason: string }

export function parseDateRange(args: { dateFrom?: unknown; dateTo?: unknown }): DateRangeResult {
  const hasFrom = args.dateFrom !== undefined && args.dateFrom !== null
  const hasTo = args.dateTo !== undefined && args.dateTo !== null
  if (!hasFrom && !hasTo) return { ok: true, range: null }

  const fromMs = hasFrom ? parseDay(args.dateFrom) : null
  if (hasFrom && fromMs === null) return { ok: false, field: 'dateFrom', reason: 'geçersiz tarih (YYYY-MM-DD)' }
  const toMs = hasTo ? parseDay(args.dateTo) : null
  if (hasTo && toMs === null) return { ok: false, field: 'dateTo', reason: 'geçersiz tarih (YYYY-MM-DD)' }

  const from = (fromMs ?? toMs) as number
  const to = (toMs ?? fromMs) as number
  if (from > to) return { ok: false, field: 'dateTo', reason: 'ters aralık' }
  return { ok: true, range: { from: new Date(from), toExclusive: new Date(to + DAY_MS) } }
}
