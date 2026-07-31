"use client";

import { useState } from 'react';
import { toast } from 'react-hot-toast';

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
        } catch (e) {
            // YAKALANMIS bir rejection `unhandledrejection`a ULASMAZ — onceki
            // surumun "Sentry global olarak alir" yorumu yanlisti ve hata
            // hicbir yere gitmiyordu (whole-branch review I4). Bu gercek bir
            // senaryo: `SavedReportDocument` fontlari fonts.gstatic.com'dan
            // cekiyor, cevrimdisi/CSP'li istemcide uretim patlar. Kullanici
            // yalnizca butonun titreyip geri geldigini goruyordu.
            console.error('Kayitli rapor PDF uretimi basarisiz', e);
            toast.error('PDF oluşturulamadı. Bağlantınızı kontrol edip tekrar deneyin.');
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
