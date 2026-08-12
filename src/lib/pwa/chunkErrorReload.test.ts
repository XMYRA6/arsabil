import { isChunkLoadError, handleChunkError, installChunkErrorReload, type ChunkErrorReloadTarget } from './chunkErrorReload'

// Kök neden: fresh deploy sonrası tarayıcıda hâlâ açık olan bayat JS bundle,
// artık sunucuda olmayan eski hash'li bir chunk'ı lazy-import etmeye çalışınca
// ChunkLoadError fırlatıyor ve rota (örn. /hesapla) hiç açılmıyordu. Mevcut
// SW controllerchange reload'u yalnızca sekme gizlenince çalıştığı için sekme
// hep görünür kaldığında (mobil aktif kullanım) hiç tetiklenmiyordu.

describe('isChunkLoadError', () => {
    it('name === "ChunkLoadError" olan hatayı tanır', () => {
        expect(isChunkLoadError({ name: 'ChunkLoadError', message: 'Loading chunk 5647 failed.' })).toBe(true)
    })

    it('yalnızca mesajı "Loading chunk X failed" olan hatayı da tanır', () => {
        expect(isChunkLoadError({ message: 'Loading chunk 5647 failed. (error: https://x/y.js)' })).toBe(true)
    })

    it('CSS chunk hatasını da tanır', () => {
        expect(isChunkLoadError({ message: 'Loading CSS chunk 12 failed.' })).toBe(true)
    })

    it('alakasız bir hatayı yanlış pozitif saymaz', () => {
        expect(isChunkLoadError(new TypeError('Cannot read properties of undefined'))).toBe(false)
    })

    it('null/undefined için false döner', () => {
        expect(isChunkLoadError(null)).toBe(false)
        expect(isChunkLoadError(undefined)).toBe(false)
    })
})

function makeTarget(existingFlag: string | null = null): ChunkErrorReloadTarget & { reload: jest.Mock; setItem: jest.Mock } {
    const reload = jest.fn()
    const setItem = jest.fn()
    return {
        sessionStorage: { getItem: jest.fn(() => existingFlag), setItem },
        location: { reload },
        reload,
        setItem,
    }
}

describe('handleChunkError', () => {
    it('chunk hatasında sayfayı bir kez yeniler ve bayrağı işaretler', () => {
        const target = makeTarget(null)
        handleChunkError({ name: 'ChunkLoadError', message: 'Loading chunk 5647 failed.' }, target)
        expect(target.reload).toHaveBeenCalledTimes(1)
        expect(target.setItem).toHaveBeenCalledWith('arsabil-chunk-reload-attempted', '1')
    })

    it('bayrak zaten set edilmişse tekrar yenilemez (sonsuz döngü koruması)', () => {
        const target = makeTarget('1')
        handleChunkError({ name: 'ChunkLoadError' }, target)
        expect(target.reload).not.toHaveBeenCalled()
    })

    it('chunk dışı bir hatada hiç yenilemez', () => {
        const target = makeTarget(null)
        handleChunkError(new TypeError('boom'), target)
        expect(target.reload).not.toHaveBeenCalled()
    })
})

describe('installChunkErrorReload', () => {
    it('error ve unhandledrejection olaylarını dinler, chunk hatasında reload tetikler', () => {
        const handlers: Record<string, (e: unknown) => void> = {}
        const reload = jest.fn()
        const fakeWin = {
            addEventListener: (type: string, fn: (e: unknown) => void) => { handlers[type] = fn },
            removeEventListener: jest.fn(),
            sessionStorage: { getItem: jest.fn(() => null), setItem: jest.fn() },
            location: { reload },
        }

        const uninstall = installChunkErrorReload(fakeWin as unknown as Window)

        handlers.error({ error: { name: 'ChunkLoadError' } })
        expect(reload).toHaveBeenCalledTimes(1)

        uninstall()
        expect(fakeWin.removeEventListener).toHaveBeenCalledWith('error', expect.any(Function))
        expect(fakeWin.removeEventListener).toHaveBeenCalledWith('unhandledrejection', expect.any(Function))
    })

    it('unhandledrejection üzerinden gelen chunk hatasını da yakalar', () => {
        const handlers: Record<string, (e: unknown) => void> = {}
        const reload = jest.fn()
        const fakeWin = {
            addEventListener: (type: string, fn: (e: unknown) => void) => { handlers[type] = fn },
            removeEventListener: jest.fn(),
            sessionStorage: { getItem: jest.fn(() => null), setItem: jest.fn() },
            location: { reload },
        }

        installChunkErrorReload(fakeWin as unknown as Window)
        handlers.unhandledrejection({ reason: { message: 'Loading chunk 12 failed.' } })
        expect(reload).toHaveBeenCalledTimes(1)
    })
})
