'use client'

import { useEffect } from 'react'

/**
 * iOS Safari, body'de bir touchstart dinleyicisi yoksa :active durumunu
 * uygulamaz. Pasif, bos bir dinleyici :active basma geri bildirimini acar.
 */
export function TouchActiveInit(): null {
    useEffect(() => {
        const noop = () => {}
        const opts = { passive: true } as const
        document.body.addEventListener('touchstart', noop, opts)
        return () => document.body.removeEventListener('touchstart', noop)
    }, [])
    return null
}
