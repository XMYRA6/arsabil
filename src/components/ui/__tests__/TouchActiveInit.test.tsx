/** @jest-environment jsdom */
import { render } from '@testing-library/react'
import { TouchActiveInit } from '../TouchActiveInit'

describe('TouchActiveInit', () => {
    afterEach(() => jest.restoreAllMocks())

    it('adds a passive touchstart listener to body on mount', () => {
        const spy = jest.spyOn(document.body, 'addEventListener')
        render(<TouchActiveInit />)
        expect(spy).toHaveBeenCalledWith('touchstart', expect.any(Function), { passive: true })
    })

    it('removes it on unmount', () => {
        const add = jest.spyOn(document.body, 'addEventListener')
        const remove = jest.spyOn(document.body, 'removeEventListener')
        const { unmount } = render(<TouchActiveInit />)
        const fn = add.mock.calls.find(c => c[0] === 'touchstart')![1]
        unmount()
        expect(remove).toHaveBeenCalledWith('touchstart', fn)
    })
})
