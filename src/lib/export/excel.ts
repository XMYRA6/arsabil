/**
 * ArsaBil — Excel Export (CSV)
 * Tarayıcıda çalışan CSV export modülü.
 * UTF-8 BOM ile Türkçe karakter desteği.
 */

export interface ScenarioData {
    name: string;
    luxLevel: number;
    apartmentSize: number;
    landShareRatio: number;
    totalApartments?: number | null;
    arsaAlani?: number | null;
    riskLevel: number;
    builderProfit: number;
    iksaMode: string;
    fdTotal: number;
    fdPerM2: number;
    mi: number;
    ma: number;
    totalCost: number;
    fa?: number | null;
    fabirim?: number | null;
    sdx?: number | null;
}

export function exportToExcel(scenarios: ScenarioData[], projectName: string): void {
    const headers = [
        'Senaryo Adı',
        'Kalite (L)',
        'Daire Alanı (m²)',
        'Arsa Payı (%)',
        'Toplam Daire',
        'Arsa Alanı (m²)',
        'Risk (%)',
        'Kâr Katsayısı (K)',
        'İksa Modu',
        'Daire Fiyatı (TL)',
        'Birim Fiyat (TL/m²)',
        'İnşaat Maliyeti (TL)',
        'Arsa Maliyeti (TL)',
        'Toplam Maliyet (TL)',
        'Arsa Değeri (TL)',
        'Arsa Birim (TL/m²)',
        'Arsa Sahibi Daire',
    ];

    const rows = scenarios.map(s => [
        s.name,
        s.luxLevel.toString(),
        s.apartmentSize.toString(),
        (s.landShareRatio * 100).toFixed(0),
        s.totalApartments?.toString() || '-',
        s.arsaAlani?.toString() || '-',
        ((s.riskLevel - 1) * 100).toFixed(0),
        s.builderProfit.toString(),
        s.iksaMode,
        s.fdTotal.toFixed(0),
        s.fdPerM2.toFixed(0),
        s.mi.toFixed(0),
        s.ma.toFixed(0),
        s.totalCost.toFixed(0),
        s.fa?.toFixed(0) || '-',
        s.fabirim?.toFixed(0) || '-',
        s.sdx?.toFixed(1) || '-',
    ]);

    // CSV with BOM for Turkish chars
    const BOM = '\uFEFF';
    const csvContent = BOM +
        headers.join(';') + '\n' +
        rows.map(row => row.join(';')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${projectName}_senaryolar_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
