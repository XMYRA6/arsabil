"use client";

import { useState } from 'react';

/**
 * Bir `number | null` degeri kontrollu bir metin input'u olarak tamponlar.
 * `value`e dogrudan baglanmak (`String(value)`) kullaniciyi alani SILEMEZ
 * hale getirir: `Number('') === 0` guard'i gecemedigi icin commit hic
 * olmaz, React input'u HEMEN eski degere geri yazar (review Finding 2,
 * 2026-07-30, BirimMaliyetField'ta bulunmustu). Yerel `girdi` string
 * state'i bu sicramayi onler: ham metin HER ZAMAN gosterilir, yalnizca
 * gecerli (>0) bir sayi girildiginde `onChange`e commit edilir. Dis
 * kaynakli deger degisiklikleri (parent'tan geri akan prop) render
 * SIRASINDA yakalanir.
 */
export function useBufferedNumberInput(
    value: number | null,
    onChange: (v: number) => void,
) {
    const [girdi, setGirdi] = useState<string>(value === null ? '' : String(value));
    const [oncekiDeger, setOncekiDeger] = useState<number | null>(value);
    if (value !== oncekiDeger) {
        setOncekiDeger(value);
        setGirdi(value === null ? '' : String(value));
    }

    const handleChange = (raw: string) => {
        setGirdi(raw);
        const v = Number(raw);
        if (Number.isFinite(v) && v > 0) {
            onChange(v);
        }
    };

    return { girdi, handleChange };
}
