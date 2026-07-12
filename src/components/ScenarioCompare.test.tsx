/** @jest-environment jsdom */
import { render, screen, waitFor, act, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ScenarioCompare } from './ScenarioCompare';

jest.mock('jspdf', () => {
    return jest.fn().mockImplementation(() => ({
        setFontSize: jest.fn(),
        text: jest.fn(),
        save: jest.fn(),
    }));
});
jest.mock('jspdf-autotable', () => jest.fn());

const scenarios = [
    {
        id: 's1', name: 'Ekonomik', luxLevel: 1.0, apartmentSize: 100, landShareRatio: 0.3,
        totalApartments: 10, riskLevel: 1, builderProfit: 1.2, fdTotal: 4000000, fdPerM2: 40000,
        mi: 1500000, ma: 1000000, totalCost: 2500000,
    },
    {
        id: 's2', name: 'Lüks', luxLevel: 1.4, apartmentSize: 140, landShareRatio: 0.35,
        totalApartments: 8, riskLevel: 2, builderProfit: 1.3, fdTotal: 6000000, fdPerM2: 42857,
        mi: 2200000, ma: 1500000, totalCost: 3700000,
    },
];

describe('ScenarioCompare', () => {
    beforeEach(() => {
        Object.assign(navigator, { clipboard: { writeText: jest.fn() } });
    });

    it('2\'den az senaryoda uyarı mesajı gösterir', () => {
        render(<ScenarioCompare scenarios={[scenarios[0]]} />);
        expect(screen.getByText(/en az 2 senaryo gereklidir/i)).toBeInTheDocument();
    });

    it('senaryo isimlerini tablo başlığında gösterir, en düşük maliyetliyi yıldızla işaretler', () => {
        render(<ScenarioCompare scenarios={scenarios} />);
        // Mobil kart görünümü de aynı senaryo adlarını render ettiği için (bkz. aşağıdaki test),
        // sorguyu masaüstü tablosuyla sınırlıyoruz — aksi halde getByText belirsiz hale gelir.
        const table = within(screen.getByRole('table'));
        expect(table.getByText(/Ekonomik/)).toBeInTheDocument();
        expect(table.getAllByText(/Lüks/).length).toBeGreaterThan(0);
        // fdTotal'i en düşük olan (Ekonomik, 4M < 6M) best — yıldız o sütunun başlığında
        const ekonomikHeader = table.getByText(/Ekonomik/).closest('th');
        expect(ekonomikHeader?.textContent).toContain('⭐');
    });

    it('mobil kart görünümünde de her iki senaryo adı bulunur (jsdom media query uygulamaz, DOM\'da ikisi de var olmalı)', () => {
        render(<ScenarioCompare scenarios={scenarios} />);
        const nameEls = screen.getAllByText(/Ekonomik/);
        // Biri <th> içinde (tablo, yıldızlı best senaryo olduğu için "Ekonomik ⭐"), biri .cardName
        // içinde (mobil kart, salt "Ekonomik") — ikisi de DOM'da
        expect(nameEls.length).toBeGreaterThanOrEqual(2);
    });

    it('onShareRequest verilmezse Paylaş butonu render edilmez', () => {
        render(<ScenarioCompare scenarios={scenarios} />);
        expect(screen.queryByText(/Paylaş/)).not.toBeInTheDocument();
    });

    it('Paylaş tıklanınca onShareRequest çağrılır ve dönen URL gösterilir; Kopyala clipboard\'a yazar', async () => {
        const onShareRequest = jest.fn().mockResolvedValue('https://arsabil.com/compare/abc123');
        render(<ScenarioCompare scenarios={scenarios} onShareRequest={onShareRequest} />);

        await act(async () => {
            screen.getByText(/🔗 Paylaş/).click();
        });
        await waitFor(() => expect(onShareRequest).toHaveBeenCalledWith(['s1', 's2']));
        expect(await screen.findByText('https://arsabil.com/compare/abc123')).toBeInTheDocument();

        await act(async () => {
            screen.getByText('Kopyala').click();
        });
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://arsabil.com/compare/abc123');
        expect(await screen.findByText('✓ Kopyalandı')).toBeInTheDocument();
    });

    it('PDF İndir tıklanınca jsPDF çağrılır', () => {
        render(<ScenarioCompare scenarios={scenarios} />);
        screen.getByText(/📄 PDF İndir/).click();
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const jsPDFMock = require('jspdf') as jest.Mock;
        expect(jsPDFMock).toHaveBeenCalled();
    });
});
