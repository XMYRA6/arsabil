"use client";

import { useState } from 'react';

/** `generateSavedReportPdf`in ilk parametresinin tipi — kaynaktan TURETILIR,
    elle yazilmaz. `as never` gibi bir kacis KULLANILMAZ.

    NOT: Hesaplama ekranindaki `generatePdfReport` (motorun tam ciktisini
    basan uretec) DEGIL, kayitli-rapor uretecinden turetiliyor: Report DB
    kaydi motor ciktilarinin (risk, iksa, marketPrice, CalculationOutput)
    cogunu hic saklamiyor, bu yuzden bu buton indirgenmis ozet uretecini
    kullaniyor (bkz. SavedReportDocument.tsx, task-9-report.md). */
type Rapor = Parameters<
    typeof import('@/lib/pdf/saved_report_generator').generateSavedReportPdf
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
            const { generateSavedReportPdf } = await import('@/lib/pdf/saved_report_generator');
            await generateSavedReportPdf(rapor);
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
