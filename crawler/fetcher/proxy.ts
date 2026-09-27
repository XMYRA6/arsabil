export interface ProxyConfig {
  server: string
  username: string
  password: string
}

/**
 * Üç env değişkeni de (server/username/password) doluysa proxy config döner,
 * herhangi biri eksik/boşsa undefined (proxysiz — varsayılan davranış). Faz 1'de
 * anonim (kimliksiz) proxy desteklenmiyor — hepsi ya var ya yok.
 */
export function resolveProxyConfig(env: NodeJS.ProcessEnv = process.env): ProxyConfig | undefined {
  const server = env.CRAWL_PROXY_SERVER?.trim()
  const username = env.CRAWL_PROXY_USERNAME?.trim()
  const password = env.CRAWL_PROXY_PASSWORD?.trim()
  if (!server || !username || !password) return undefined
  return { server, username, password }
}
