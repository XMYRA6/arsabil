const RELOAD_FLAG_KEY = 'arsabil-chunk-reload-attempted'

export function isChunkLoadError(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false
    const err = error as { name?: unknown; message?: unknown }
    if (err.name === 'ChunkLoadError') return true
    return typeof err.message === 'string' && /Loading (chunk|CSS chunk) [\w.-]+ failed/i.test(err.message)
}

export interface ChunkErrorReloadTarget {
    sessionStorage: Pick<Storage, 'getItem' | 'setItem'>
    location: Pick<Location, 'reload'>
}

// SW controllerchange reload'u yalnızca sekme gizlenince tetikleniyor (kullanıcıyı
// bölmemek için) — sekme hiç gizlenmezse (mobilde aktif kullanım), yeni deploy
// eski chunk dosyalarını sunucudan tamamen kaldırdığı için tarayıcıdaki bayat
// bundle bir sonraki lazy-import'ta ChunkLoadError ile kalıcı olarak bozuluyordu.
// Bu, o durumu doğrudan yakalayıp tek seferlik zorla yeniliyor.
export function handleChunkError(error: unknown, target: ChunkErrorReloadTarget): void {
    if (!isChunkLoadError(error)) return
    if (target.sessionStorage.getItem(RELOAD_FLAG_KEY)) return
    target.sessionStorage.setItem(RELOAD_FLAG_KEY, '1')
    target.location.reload()
}

export function installChunkErrorReload(win: Window = window): () => void {
    const onError = (event: ErrorEvent) => handleChunkError(event.error, win)
    const onRejection = (event: PromiseRejectionEvent) => handleChunkError(event.reason, win)
    win.addEventListener('error', onError)
    win.addEventListener('unhandledrejection', onRejection)
    return () => {
        win.removeEventListener('error', onError)
        win.removeEventListener('unhandledrejection', onRejection)
    }
}
