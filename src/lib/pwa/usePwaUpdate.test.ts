/** @jest-environment jsdom */
import { renderHook, act } from '@testing-library/react'
import { usePwaUpdate, type PwaUpdateTarget } from './usePwaUpdate'

class FakeEventTarget {
    listeners: Record<string, Array<() => void>> = {}
    addEventListener(type: string, cb: () => void) {
        (this.listeners[type] ??= []).push(cb)
    }
    removeEventListener(type: string, cb: () => void) {
        this.listeners[type] = (this.listeners[type] || []).filter(l => l !== cb)
    }
    dispatch(type: string) {
        (this.listeners[type] || []).forEach(cb => cb())
    }
}

class FakeWorker extends FakeEventTarget {
    state: string = 'installing'
    postMessage = jest.fn()
}

class FakeRegistration extends FakeEventTarget {
    waiting: FakeWorker | null = null
    installing: FakeWorker | null = null
}

function makeTarget(reg: FakeRegistration, hasControllerInitially: boolean) {
    const controllerChangeTarget = new FakeEventTarget()
    let hasController = hasControllerInitially
    const reload = jest.fn()
    const target: PwaUpdateTarget = {
        getRegistration: () => Promise.resolve(reg),
        hasController: () => hasController,
        addControllerChangeListener: (l) => controllerChangeTarget.addEventListener('controllerchange', l),
        removeControllerChangeListener: (l) => controllerChangeTarget.removeEventListener('controllerchange', l),
        reload,
    }
    return {
        target,
        fireControllerChange: () => controllerChangeTarget.dispatch('controllerchange'),
        setController: (v: boolean) => { hasController = v },
        reload,
    }
}

describe('usePwaUpdate', () => {
    it('ilk kurulumda (controller yok) waiting worker olsa bile updateAvailable false kalir', async () => {
        const reg = new FakeRegistration()
        reg.waiting = new FakeWorker()
        const { target } = makeTarget(reg, false)

        const { result } = renderHook(() => usePwaUpdate(target))
        await act(async () => { await Promise.resolve() })

        expect(result.current.updateAvailable).toBe(false)
    })

    it('mount aninda zaten registration.waiting varsa (controller varken) hemen updateAvailable true olur', async () => {
        const reg = new FakeRegistration()
        reg.waiting = new FakeWorker()
        const { target } = makeTarget(reg, true)

        const { result } = renderHook(() => usePwaUpdate(target))
        await act(async () => { await Promise.resolve() })

        expect(result.current.updateAvailable).toBe(true)
    })

    it('mevcut controller varken installing worker installed olunca updateAvailable true olur', async () => {
        const reg = new FakeRegistration()
        const { target } = makeTarget(reg, true)

        const { result } = renderHook(() => usePwaUpdate(target))
        await act(async () => { await Promise.resolve() })
        expect(result.current.updateAvailable).toBe(false)

        const installing = new FakeWorker()
        reg.installing = installing
        act(() => { reg.dispatch('updatefound') })
        act(() => {
            installing.state = 'installed'
            installing.dispatch('statechange')
        })

        expect(result.current.updateAvailable).toBe(true)
    })

    it('applyUpdate() waiting worker a SKIP_WAITING mesaji gonderir, controllerchange sonrasi reload cagirir', async () => {
        const reg = new FakeRegistration()
        const waiting = new FakeWorker()
        reg.waiting = waiting
        const { target, fireControllerChange, reload } = makeTarget(reg, true)

        const { result } = renderHook(() => usePwaUpdate(target))
        await act(async () => { await Promise.resolve() })
        expect(result.current.updateAvailable).toBe(true)

        act(() => { result.current.applyUpdate() })
        expect(waiting.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' })
        expect(reload).not.toHaveBeenCalled()

        act(() => { fireControllerChange() })
        expect(reload).toHaveBeenCalledTimes(1)
    })

    it('serviceWorker desteklenmeyen tarayicida (getRegistration undefined doner) hata firlatmaz, updateAvailable false kalir', async () => {
        const target: PwaUpdateTarget = {
            getRegistration: () => Promise.resolve(undefined),
            hasController: () => false,
            addControllerChangeListener: () => {},
            removeControllerChangeListener: () => {},
            reload: jest.fn(),
        }

        const { result } = renderHook(() => usePwaUpdate(target))
        await act(async () => { await Promise.resolve() })

        expect(result.current.updateAvailable).toBe(false)
    })

    it('getRegistration reddedilirse (orn. SecurityError) yakalanmamis promise reddi olusmaz', async () => {
        const target: PwaUpdateTarget = {
            getRegistration: () => Promise.reject(new Error('SecurityError')),
            hasController: () => false,
            addControllerChangeListener: () => {},
            removeControllerChangeListener: () => {},
            reload: jest.fn(),
        }

        const onUnhandledRejection = jest.fn()
        process.on('unhandledRejection', onUnhandledRejection)

        const { result } = renderHook(() => usePwaUpdate(target))
        await act(async () => { await Promise.resolve(); await Promise.resolve() })

        expect(result.current.updateAvailable).toBe(false)
        expect(onUnhandledRejection).not.toHaveBeenCalled()

        process.off('unhandledRejection', onUnhandledRejection)
    })

    it('applyUpdate() no-arg target ile iki render sonrasi da hata firlatmaz (varsayilan target render basina yeniden olusturulmaz)', () => {
        const { rerender } = renderHook(() => usePwaUpdate())
        expect(() => rerender()).not.toThrow()
    })

    describe('applyUpdate() coklu-sekme senaryosu (postMessage basarisiz olur)', () => {
        beforeEach(() => {
            jest.useFakeTimers()
        })

        afterEach(() => {
            jest.useRealTimers()
        })

        it('postMessage firlatirsa (worker zaten activated/redundant) yine de fallback zaman asimindan sonra tam olarak bir kez reload cagirir', async () => {
            const reg = new FakeRegistration()
            const waiting = new FakeWorker()
            waiting.postMessage = jest.fn(() => {
                throw new DOMException('worker redundant', 'InvalidStateError')
            })
            reg.waiting = waiting
            const { target, reload } = makeTarget(reg, true)

            const { result } = renderHook(() => usePwaUpdate(target))
            await act(async () => { await Promise.resolve() })
            expect(result.current.updateAvailable).toBe(true)

            expect(() => {
                act(() => { result.current.applyUpdate() })
            }).not.toThrow()
            expect(reload).not.toHaveBeenCalled()

            act(() => { jest.advanceTimersByTime(3000) })
            expect(reload).toHaveBeenCalledTimes(1)
        })

        it('controllerchange zaman asimindan once normal gelirse reload tam olarak bir kez cagirilir (fallback ikinci kez tetiklenmez)', async () => {
            const reg = new FakeRegistration()
            const waiting = new FakeWorker()
            reg.waiting = waiting
            const { target, fireControllerChange, reload } = makeTarget(reg, true)

            const { result } = renderHook(() => usePwaUpdate(target))
            await act(async () => { await Promise.resolve() })
            expect(result.current.updateAvailable).toBe(true)

            act(() => { result.current.applyUpdate() })
            expect(waiting.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' })

            act(() => { fireControllerChange() })
            expect(reload).toHaveBeenCalledTimes(1)

            act(() => { jest.advanceTimersByTime(3000) })
            expect(reload).toHaveBeenCalledTimes(1)
        })
    })

    it('unmount aninda statechange dinleyicisi temizlenir, kacirilmis olay hataya neden olmaz', async () => {
        const reg = new FakeRegistration()
        const { target } = makeTarget(reg, true)

        const { unmount } = renderHook(() => usePwaUpdate(target))
        await act(async () => { await Promise.resolve() })

        // updatefound'u tetikle, installing worker'a statechange dinleyicisi eklenecek
        const installing = new FakeWorker()
        reg.installing = installing
        act(() => { reg.dispatch('updatefound') })

        // Dinleyicinin eklenmiş olduğunu doğrula
        expect(installing.listeners['statechange'] || []).toHaveLength(1)

        // Hook'u unmount et
        // Cleanup fonksiyonu çalışacak ve statechange dinleyicisini temizlemesi gerekir
        unmount()

        // Unmount sonrası dinleyicinin temizlenmiş olduğunu doğrula
        // (cleanup sırasında, statechange'den ÖNCE temizlenmesi gerekir)
        expect(installing.listeners['statechange'] || []).toHaveLength(0)

        // Şimdi statechange'i tetikle - hiçbir dinleyici olmadığı için hiçbir şey yapılmaz
        act(() => {
            installing.state = 'installed'
            installing.dispatch('statechange')
        })

        // Yine hiçbir dinleyici olmamalı
        expect(installing.listeners['statechange'] || []).toHaveLength(0)
    })
})
