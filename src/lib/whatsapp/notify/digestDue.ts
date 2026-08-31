import { ymKey } from './formatPctChange'
import type { SubLike } from './types'

export function digestDue(
  sub: Pick<SubLike, 'lastDigestMonth'>,
  now: Date,
  digestDay: number
): boolean {
  return now.getUTCDate() >= digestDay && sub.lastDigestMonth !== ymKey(now)
}
