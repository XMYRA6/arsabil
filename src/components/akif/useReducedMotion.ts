import { useSyncExternalStore } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

function subscribe(cb: () => void) {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {}
  const mq = window.matchMedia(QUERY)
  mq.addEventListener?.('change', cb)
  return () => mq.removeEventListener?.('change', cb)
}
const get = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(QUERY).matches

/** Sunucuda/hidrasyonda false; istemcide kullanıcının azaltılmış hareket tercihi. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, get, () => false)
}
