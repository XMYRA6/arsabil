"use client";

import { useState } from 'react';
import { formatTRThousands } from './trNumberFormat';

/**
 * Bir `number | null` degeri kontrollu bir metin input'u olarak tamponlar,
 * gorunumde Turkce binlik ayirac ("12000" -> "12.000") uygular.
 * `value`e dogrudan baglanmak (`String(value)`) kullaniciyi alani SILEMEZ
 * hale getirir: `Number('') === 0` guard'i gecemedigi icin commit hic
 * olmaz, React input'u HEMEN eski degere geri yazar (review Finding 2,
 * 2026-07-30, BirimMaliyetField'ta bulunmustu). Yerel `girdi` string
 * state'i bu sicramayi onler: ham metin HER ZAMAN gosterilir, yalnizca
 * gecerli (>0) bir sayi girildiginde `onChange`e commit edilir. Dis
 * kaynakli deger degisiklikleri (parent'tan geri akan prop) render
 * SIRASINDA yakalanir.
 *
 * Ayirac karakterleri YALNIZCA goruntude var — `onChange`e giden deger
 * `formatTRThousands`in kendi rakam-siyirma mantigiyla hesaplanir, ASLA
 * `Number(raw)` ile dogrudan parse edilmez (nokta ayirac JS'te ondalik
 * noktasi sayilirdi, "12.0000" yanlislikla 12 olarak commit edilirdi).
 * Tuketen input `type="number"` OLAMAZ (tarayici ayirac karakterlerini
 * kabul etmez) — `type="text" inputMode="decimal"` kullanilmali.
 */
export function useBufferedNumberInput(
    value: number | null,
    onChange: (v: number) => void,
) {
    const [girdi, setGirdi] = useState<string>(value === null ? '' : formatTRThousands(String(value)));
    const [oncekiDeger, setOncekiDeger] = useState<number | null>(value);
    if (value !== oncekiDeger) {
        setOncekiDeger(value);
        setGirdi(value === null ? '' : formatTRThousands(String(value)));
    }

    const handleChange = (raw: string) => {
        const formatted = formatTRThousands(raw);
        setGirdi(formatted);
        const digitsOnly = raw.replace(/\D/g, '');
        const v = digitsOnly === '' ? 0 : parseInt(digitsOnly, 10);
        if (Number.isFinite(v) && v > 0) {
            onChange(v);
        }
    };

    return { girdi, handleChange };
}
