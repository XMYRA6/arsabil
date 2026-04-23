/**
 * ArsaBil — Finansal Modelleme Motoru
 * Nakit akışı, IRR, NPV, Banka Kredisi Simülasyonu
 */

// ========== INTERFACES ==========

export interface CashFlowInput {
    totalInvestment: number;        // Toplam yatırım (M)
    totalRevenue: number;           // Toplam gelir (Sd × FD veya FD)
    constructionMonths: number;     // İnşaat süresi (ay)
    sellingMonths: number;          // Satış süresi (ay)
    discountRate: number;           // Yıllık iskonto oranı (%)
}

export interface LoanInput {
    principal: number;              // Anapara (TL)
    annualRate: number;             // Yıllık faiz oranı (%)
    termMonths: number;             // Kredi vadesi (ay)
    type: 'annuity' | 'equal';     // Eşit taksit / Eşit anapara
}

export interface CashFlowRow {
    month: number;
    investment: number;     // Harcama (negatif)
    revenue: number;        // Gelir (pozitif)
    netCashFlow: number;    // Net akış
    cumulative: number;     // Kümülatif
}

export interface LoanRow {
    month: number;
    payment: number;        // Aylık taksit
    principal: number;      // Anapara payı
    interest: number;       // Faiz payı
    balance: number;        // Kalan borç
}

export interface FinancialResult {
    cashFlows: CashFlowRow[];
    totalInvestment: number;
    totalRevenue: number;
    netProfit: number;
    profitMargin: number;   // %
    irr: number;            // % yıllık
    npv: number;            // TL
    paybackMonth: number;   // Geri ödeme süresi (ay)
    roi: number;            // % Return on Investment
}

export interface LoanResult {
    schedule: LoanRow[];
    totalPayment: number;
    totalInterest: number;
    monthlyPayment: number; // İlk taksit (annuity'de sabit)
    effectiveRate: number;  // Efektif yıllık maliyet (%)
}

// ========== CASH FLOW ENGINE ==========

export function calculateCashFlow(input: CashFlowInput): FinancialResult {
    const { totalInvestment, totalRevenue, constructionMonths, sellingMonths, discountRate } = input;
    const totalMonths = constructionMonths + sellingMonths;

    // Her ay eşit harcama (inşaat döneminde)
    const monthlyInvestment = totalInvestment / constructionMonths;
    // Her ay eşit gelir (satış döneminde)
    const monthlyRevenue = totalRevenue / sellingMonths;

    const cashFlows: CashFlowRow[] = [];
    let cumulative = 0;
    let paybackMonth = totalMonths;

    for (let m = 1; m <= totalMonths; m++) {
        const inv = m <= constructionMonths ? -monthlyInvestment : 0;
        const rev = m > constructionMonths ? monthlyRevenue : 0;
        const net = inv + rev;
        cumulative += net;

        cashFlows.push({
            month: m,
            investment: inv,
            revenue: rev,
            netCashFlow: net,
            cumulative,
        });

        // Geri ödeme noktası
        if (cumulative >= 0 && paybackMonth === totalMonths) {
            paybackMonth = m;
        }
    }

    // IRR hesabı (Newton-Raphson ile aylık, sonra yıllığa çevir)
    const netFlows = cashFlows.map(cf => cf.netCashFlow);
    const monthlyIRR = computeIRR(netFlows);
    const annualIRR = ((1 + monthlyIRR) ** 12 - 1) * 100;

    // NPV hesabı
    const monthlyDiscount = (1 + discountRate / 100) ** (1 / 12) - 1;
    let npv = 0;
    for (let i = 0; i < netFlows.length; i++) {
        npv += netFlows[i] / (1 + monthlyDiscount) ** (i + 1);
    }

    const netProfit = totalRevenue - totalInvestment;
    const profitMargin = totalInvestment > 0 ? (netProfit / totalInvestment) * 100 : 0;
    const roi = totalInvestment > 0 ? (netProfit / totalInvestment) * 100 : 0;

    return {
        cashFlows,
        totalInvestment,
        totalRevenue,
        netProfit,
        profitMargin,
        irr: isFinite(annualIRR) ? annualIRR : 0,
        npv,
        paybackMonth,
        roi,
    };
}

// ========== LOAN CALCULATOR ==========

export function calculateLoan(input: LoanInput): LoanResult {
    const { principal, annualRate, termMonths, type } = input;
    const monthlyRate = annualRate / 100 / 12;

    const schedule: LoanRow[] = [];
    let balance = principal;
    let totalPayment = 0;
    let totalInterest = 0;

    if (type === 'annuity') {
        // Eşit taksit (annuity)
        const payment = monthlyRate > 0
            ? principal * (monthlyRate * (1 + monthlyRate) ** termMonths) / ((1 + monthlyRate) ** termMonths - 1)
            : principal / termMonths;

        for (let m = 1; m <= termMonths; m++) {
            const interest = balance * monthlyRate;
            const principalPart = payment - interest;
            balance -= principalPart;

            schedule.push({
                month: m,
                payment,
                principal: principalPart,
                interest,
                balance: Math.max(0, balance),
            });

            totalPayment += payment;
            totalInterest += interest;
        }

        return {
            schedule,
            totalPayment,
            totalInterest,
            monthlyPayment: payment,
            effectiveRate: principal > 0 ? (totalInterest / principal) * 100 : 0,
        };
    } else {
        // Eşit anapara
        const monthlyPrincipal = principal / termMonths;

        for (let m = 1; m <= termMonths; m++) {
            const interest = balance * monthlyRate;
            const payment = monthlyPrincipal + interest;
            balance -= monthlyPrincipal;

            schedule.push({
                month: m,
                payment,
                principal: monthlyPrincipal,
                interest,
                balance: Math.max(0, balance),
            });

            totalPayment += payment;
            totalInterest += interest;
        }

        return {
            schedule,
            totalPayment,
            totalInterest,
            monthlyPayment: schedule[0]?.payment || 0,
            effectiveRate: principal > 0 ? (totalInterest / principal) * 100 : 0,
        };
    }
}

// ========== IRR (Newton-Raphson) ==========

function computeIRR(cashFlows: number[], guess: number = 0.01, maxIter: number = 100, tol: number = 1e-7): number {
    let rate = guess;

    for (let i = 0; i < maxIter; i++) {
        let npv = 0;
        let dnpv = 0;

        for (let t = 0; t < cashFlows.length; t++) {
            const factor = (1 + rate) ** (t + 1);
            npv += cashFlows[t] / factor;
            dnpv -= (t + 1) * cashFlows[t] / ((1 + rate) ** (t + 2));
        }

        if (Math.abs(dnpv) < 1e-10) break;

        const newRate = rate - npv / dnpv;
        if (Math.abs(newRate - rate) < tol) return newRate;
        rate = newRate;
    }

    return rate;
}
