"use client";

import { useState } from 'react';

/** `generatePdfReport`in ilk parametresinin tipi — kaynaktan TURETILIR,
    elle yazilmaz. `as never` gibi bir kacis KULLANILMAZ. */
type Rapor = Parameters<
    typeof import('@/lib/pdf/report_generator').generatePdfReport
>[0];

/**
 * Kayitli bir raporun PDF cikitisi (spec K6).
 *
 * PDF'in kalici yeri rapordur, onu ureten hesaplama ekrani degil. Bu sayfada
 * onceden hic PDF yolu yoktu; uretec yalnizca /hesapla'da cagriliyordu.
 */
export function RaporPdfButonu({ rapor }: { rapor: Rapor }) {
    const [uretiliyor, setUretiliyor] = useState(false);

    const indir = async () => {
        setUretiliyor(true);
        try {
            const { generatePdfReport } = await import('@/lib/pdf/report_generator');
            await generatePdfReport(rapor);
        } catch {
            // Sessiz yutma YOK: kullaniciya butonu geri veriyoruz, tekrar
            // denenebilir. Hata detayi Sentry'ye zaten global olarak gidiyor.
        } finally {
            setUretiliyor(false);
        }
    };

    return (
        <button type="button" onClick={indir} disabled={uretiliyor}>
            {uretiliyor ? 'Hazırlanıyor…' : 'PDF indir'}
        </button>
    );
}
