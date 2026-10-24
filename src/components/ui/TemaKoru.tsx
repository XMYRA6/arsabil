"use client";

import { useLayoutEffect } from 'react';

/**
 * `notFound()` gibi durumlarda Next kök düzeni istemcide yeniden çizer; bu sırada
 * <head> içindeki tema betiği çalışmaz ve React `data-theme="light"` değerini geri yazar
 * (kayıtlı tercih koyuysa 404/geçersiz-bağlantı sayfaları açık kalıyordu).
 * Bu bileşen her bağlanışta kayıtlı tercihi yeniden uygular; kayıt yoksa dokunmaz.
 */
export function TemaKoru() {
    useLayoutEffect(() => {
        try {
            const t = localStorage.getItem('arsabil-theme');
            if ((t === 'dark' || t === 'light') && document.documentElement.getAttribute('data-theme') !== t) {
                document.documentElement.setAttribute('data-theme', t);
            }
        } catch { /* gizli sekme vb. */ }
    }, []);
    return null;
}
