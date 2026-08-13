"use client";

import { useEffect, useState } from 'react';

/**
 * `window.innerHeight` (layout viewport, SABIT) ile `window.visualViewport`
 * (gercek gorunur alan, DINAMIK) arasindaki farki px olarak doner. Iki ayri
 * senaryoyu kapsar, ikisi de `position:fixed;bottom:0` olan elemanlari
 * (bkz. `BottomSheet.module.css`in `.sheet`i, `BottomNavbar.module.css`in
 * `.bottomNav`u) yanlis konumlandirir:
 *
 * 1. **Sanal klavye acilir** (POZITIF deger) — `visualViewport.height`
 *    KUCULUR. `bottom:0` eleman klavyenin ALTINDA kalir, kullanicinin
 *    duzenledigi input gorunmez olur (kullanici bulgusu: "klavyenin
 *    acilmasiyla tasarim berbat oluyor").
 * 2. **Safari arac cubugu (URL bar) kaydirmayla gizlenir** (NEGATIF deger)
 *    — `visualViewport.height` `window.innerHeight`den BUYUR (gercek
 *    gorunur alan genisler). `bottom:0` eleman ESKI (kucuk) viewport'a
 *    gore sabitlenmis kalir, GERCEK alt kenara ulasamaz — kullanici
 *    bulgusu: "kaydirma cubugu ile navbar arasinda gereksiz boluk kaliyor".
 *
 * Deger KIRPILMAZ (`Math.max(0,...)` KASITLI OLARAK KULLANILMAZ) — negatif
 * durumda tuketici `bottom` ofsetini bu kadar AZALTARAK (eksi yonde) elemani
 * yeni acilan alani doldurana kadar asagi itebilmeli; 0'a kirpmak bu
 * sinyali yok ederdi.
 *
 * `visualViewport.offsetTop` da dusulur: sayfa kaydirmasi gorsel
 * viewport'un ust kenarini da kaydirabilir — yalnizca YUKSEKLIK farkina
 * bakmak yanlis bir deger uretirdi.
 *
 * Eski tarayicilarda (`visualViewport` yok) sessizce 0 doner — bu
 * farkindalik OZELLIGI kaybolur ama hicbir hata firlatilmaz, eski
 * `bottom:0` davranisina sessizce geri duser.
 */
export function useKeyboardInset(): number {
    const [inset, setInset] = useState(0);

    useEffect(() => {
        const vv = window.visualViewport;
        if (!vv) return;

        const update = () => {
            const gap = window.innerHeight - vv.height - vv.offsetTop;
            setInset(Math.round(gap));
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
