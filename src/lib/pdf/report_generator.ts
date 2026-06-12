/**
 * ArsaBil — PDF Rapor Üretici
 * jsPDF ile profesyonel hesaplama raporu oluşturur.
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CalculationOutput } from '@/lib/calculator/engine_v2';

// jspdf-autotable type extension
declare module 'jspdf' {
    interface jsPDF {
        lastAutoTable: { finalY: number };
    }
}

interface ReportInput {
    // Girdi Parametreleri
    luxLevel: number;
    apartmentSize: number;
    landShareRatio: number;
    totalApartments?: number;
    arsaAlani?: number;
    riskLevel: number;
    builderProfit: number;
    iksaMode: string;
    iksaPercentage?: number;
    iksaManualTL?: number;
    marketPrice: number;

    // Hesaplama Sonuçları
    result: CalculationOutput;
}

export function generatePdfReport(input: ReportInput): void {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;

    // ========== HEADER ==========
    doc.setFillColor(11, 36, 67); // #0b2443
    doc.rect(0, 0, pageWidth, 45, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('ArsaBil', margin, 20);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Arsa Payı ve Kat Karşılığı Fizibilite Raporu', margin, 30);

    const today = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
    doc.text(today, pageWidth - margin, 30, { align: 'right' });

    // ========== DAİRE FİYATI KUTUSU ==========
    let y = 55;
    doc.setFillColor(109, 91, 246); // Aurora violet
    doc.roundedRect(margin, y, pageWidth - 2 * margin, 30, 5, 5, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(`₺${input.result.FD_total.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`, margin + 10, y + 14);

    doc.setFontSize(10);
    doc.text(`${input.result.FD_per_m2.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL/m²`, margin + 10, y + 24);

    doc.setFontSize(12);
    doc.text('Daire Fiyatı', pageWidth - margin - 10, y + 18, { align: 'right' });

    // ========== GİRDİ PARAMETRELERİ ==========
    y = 95;
    doc.setTextColor(11, 27, 43);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Girdi Parametreleri', margin, y);

    const luxLabels: Record<number, string> = { 1.0: 'Standart', 1.2: 'Orta', 1.4: 'Lüks' };
    const inputData = [
        ['Daire Standardı (L)', luxLabels[input.luxLevel] || `x${input.luxLevel}`],
        ['Daire Alanı (Ad)', `${input.apartmentSize} m²`],
        ['Arsa Payı (x)', `%${input.landShareRatio}`],
        ['Müteahhit Kârı (K)', `x${input.builderProfit}`],
        ['Risk Payı (R)', input.riskLevel > 0 ? `%${input.riskLevel}` : 'Yok'],
        ['İksa Masrafı', input.iksaMode === 'off' ? 'Yok' : input.iksaMode === 'percentage' ? `%${input.iksaPercentage}` : `₺${input.iksaManualTL?.toLocaleString('tr-TR')}`],
    ];

    if (input.totalApartments) inputData.push(['Toplam Daire Sayısı (Sd)', `${input.totalApartments} daire`]);
    if (input.arsaAlani) inputData.push(['Arsa Alanı (Aa)', `${input.arsaAlani} m²`]);
    if (input.marketPrice > 0) inputData.push(['Piyasa Fiyatı', `₺${input.marketPrice.toLocaleString('tr-TR')}`]);

    autoTable(doc, {
        startY: y + 5,
        head: [['Parametre', 'Değer']],
        body: inputData,
        margin: { left: margin, right: margin },
        headStyles: { fillColor: [11, 36, 67], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 9, textColor: [11, 27, 43] },
        alternateRowStyles: { fillColor: [243, 246, 251] },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 } },
    });

    // ========== HESAPLAMA SONUÇLARI ==========
    y = doc.lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Hesaplama Sonuçları', margin, y);

    const r = input.result;
    const resultData = [
        ['Ham İnşaat Maliyeti (Mi_base)', `₺${r.Mi_base.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`],
        ['İksa Tutarı (Mz)', `₺${r.Mz.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`],
        ['Toplam İnşaat Maliyeti (Mi)', `₺${r.Mi.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`],
        ['Arsa Maliyeti (Ma)', `₺${r.Ma.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`],
        ['Genel Toplam Maliyet (M)', `₺${r.M.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`],
        ['Daire Fiyatı (FD)', `₺${r.FD_total.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`],
        ['Daire Birim Fiyatı (FDbirim)', `${r.FD_per_m2.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL/m²`],
    ];

    if (r.Sdx !== null) resultData.push(['Arsa Sahibi Daire Payı (Sdx)', `${Number(r.Sdx).toFixed(1)} daire`]);
    if (r.FA !== null) resultData.push(['Arsa Fiyatı (FA)', `₺${r.FA.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`]);
    if (r.FAbirim !== null) resultData.push(['Arsa Birim Fiyatı (FAbirim)', `${r.FAbirim.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL/m²`]);

    autoTable(doc, {
        startY: y + 5,
        head: [['Sonuç', 'Değer']],
        body: resultData,
        margin: { left: margin, right: margin },
        headStyles: { fillColor: [109, 91, 246], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 9, textColor: [11, 27, 43] },
        alternateRowStyles: { fillColor: [243, 246, 251] },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 70 } },
    });

    // ========== MALİYET DAĞILIMI ==========
    y = doc.lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Maliyet Dağılımı', margin, y);

    const totalCost = r.FD_total;
    const profit = r.FD_total - r.M;
    const riskCost = r.Mi - r.Mi_base - r.Mz;

    const breakdownData = [
        ['İnşaat', `₺${r.Mi_base.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`, `%${totalCost > 0 ? (r.Mi_base / totalCost * 100).toFixed(1) : 0}`],
        ['Arsa', `₺${r.Ma.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`, `%${totalCost > 0 ? (r.Ma / totalCost * 100).toFixed(1) : 0}`],
        ['Kâr', `₺${profit.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`, `%${totalCost > 0 ? (profit / totalCost * 100).toFixed(1) : 0}`],
        ['İksa', `₺${r.Mz.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`, `%${totalCost > 0 ? (r.Mz / totalCost * 100).toFixed(1) : 0}`],
        ['Risk', `₺${riskCost.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`, `%${totalCost > 0 ? (riskCost / totalCost * 100).toFixed(1) : 0}`],
    ];

    autoTable(doc, {
        startY: y + 5,
        head: [['Kalem', 'Tutar', 'Oran']],
        body: breakdownData,
        margin: { left: margin, right: margin },
        headStyles: { fillColor: [11, 36, 67], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 9, textColor: [11, 27, 43] },
        alternateRowStyles: { fillColor: [243, 246, 251] },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 } },
    });

    // ========== FOOTER ==========
    y = doc.lastAutoTable.finalY + 20;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageWidth - margin, y);

    doc.setFontSize(8);
    doc.setTextColor(107, 122, 144);
    doc.text('Bu rapor ArsaBil fizibilite motoru (Engine v2) tarafından otomatik oluşturulmuştur.', margin, y + 8);
    doc.text('arsabil.com', pageWidth - margin, y + 8, { align: 'right' });

    // Download
    doc.save(`ArsaBilRapor_${new Date().toISOString().slice(0, 10)}.pdf`);
}
