"use client";

import { useEffect, useState } from 'react';

/**
 * iOS/Android'de sanal klavye acilinca `window.visualViewport.height`
 * kuculur, `window.innerHeight` (layout viewport) DEGISMEZ. Aradaki fark,
 * klavyenin ekranda kapladigi piksel yuksekligidir — `position:fixed;
 * bottom:0` olan bir eleman (bkz. `BottomSheet.module.css`in `.sheet`i)
 * bunu bilmeden klavyenin ALTINDA kalir, kullanicinin duzenledigi input
 * gorunmez olur ve gecisler sirasinda gorsel olarak "zipliyormus" gibi
 * durur (kullanici bulgusu: "klavyenin acilmasiyla tasarim berbat oluyor").
 *
 * `visualViewport.offsetTop` da dusulur: klavye disinda, sayfa kaydirmasi
 * (adres cubugu gizlenmesi vb.) de gorsel viewport'un ust kenarini
 * kaydirabilir — yalnizca YUKSEKLIK farkina bakmak bu durumlarda yanlis
 * bir "klavye acik" degeri urretirdi.
 *
 * Eski tarayicilarda (`visualViewport` yok) sessizce 0 doner — klavye
 * farkinda olma OZELLIGI kaybolur ama hicbir hata firlatilmaz, eski
 * `bottom:0` davranisina sessizce geri duser.
 */
export function useKeyboardInset(): number {
    const [inset, setInset] = useState(0);

    useEffect(() => {
        const vv = window.visualViewport;
        if (!vv) return;

        const update = () => {
            const gap = window.innerHeight - vv.height - vv.offsetTop;
            setInset(Math.max(0, Math.round(gap)));
        };

        update();
        vv.addEventListener('resize', update);
        vv.addEventListener('scroll', update);
        return () => {
            vv.removeEventListener('resize', update);
            vv.removeEventListener('scroll', update);
        };
    }, []);

    return inset;
}
