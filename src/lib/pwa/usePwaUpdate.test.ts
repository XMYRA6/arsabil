/** @jest-environment jsdom */
import { renderHook, act } from '@testing-library/react'
import { usePwaUpdate, type PwaUpdateTarget } from './usePwaUpdate'

class FakeEventTarget {
    private listeners: Record<string, Array<() => void>> = {}
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
})
