export interface CrawlConfig {
  minDelayMs: number
  maxDelayMs: number
  breakEveryN: number
  breakMinMs: number
  breakMaxMs: number
  maxRequestsPerRun: number
  detailRefreshDays: number
  perPortalCooldownHours: number
  unparseableAbortRatio: number
}

export const DEFAULT_CONFIG: CrawlConfig = {
  minDelayMs: 20_000,
  maxDelayMs: 40_000,
  breakEveryN: 15,
  breakMinMs: 180_000,
  breakMaxMs: 480_000,
  maxRequestsPerRun: 300,
  detailRefreshDays: 7,
  perPortalCooldownHours: 12,
  unparseableAbortRatio: 0.3,
}

export function randDelayMs(cfg: CrawlConfig): number {
  return Math.floor(cfg.minDelayMs + Math.random() * (cfg.maxDelayMs - cfg.minDelayMs))
}
