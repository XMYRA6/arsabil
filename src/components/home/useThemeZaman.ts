import { useSyncExternalStore } from 'react'
import type { Zaman } from '@/lib/dioramas/scene'

/** Tema (`data-theme`) → zaman: açık = gündüz, koyu = gece. Sunucuda ve ilk boyamada gündüz. */
function subscribeTheme(cb: () => void) {
  const mo = new MutationObserver(cb)
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  return () => mo.disconnect()
}

export function useThemeZaman(): Zaman {
  return useSyncExternalStore(
    subscribeTheme,
    () => (document.documentElement.getAttribute('data-theme') === 'dark' ? 'gece' : 'gunduz'),
    () => 'gunduz',
  )
}
