"use client";

import React, { useState, useMemo } from 'react';
import { calculateCashFlow, calculateLoan, FinancialResult, LoanResult } from '@/lib/finance/engine';

interface Props {
    totalInvestment: number;  // M (toplam maliyet)
    totalRevenue: number;     // Sd × FD veya FD
}

export const FinancialDashboard: React.FC<Props> = ({ totalInvestment, totalRevenue }) => {
    // Parametreler
    const [constructionMonths, setConstructionMonths] = useState(18);
    const [sellingMonths, setSellingMonths] = useState(12);
    const [discountRate, setDiscountRate] = useState(25); // % yıllık
    // Kredi
    const [useLoan, setUseLoan] = useState(false);
    const [loanPercent, setLoanPercent] = useState(50); // Yatırımın %'si
    const [loanRate, setLoanRate] = useState(42); // % yıllık
    const [loanTermMonths, setLoanTermMonths] = useState(36);
    const [loanType, setLoanType] = useState<'annuity' | 'equal'>('annuity');

    const financial = useMemo<FinancialResult>(() =>
        calculateCashFlow({
            totalInvestment,
            totalRevenue,
            constructionMonths,
            sellingMonths,
            discountRate,
        }),
        [totalInvestment, totalRevenue, constructionMonths, sellingMonths, discountRate]
    );

    const loan = useMemo<LoanResult | null>(() => {
        if (!useLoan) return null;
        return calculateLoan({
            principal: totalInvestment * (loanPercent / 100),
            annualRate: loanRate,
            termMonths: loanTermMonths,
            type: loanType,
        });
    }, [useLoan, totalInvestment, loanPercent, loanRate, loanTermMonths, loanType]);

    const formatTL = (v: number) => '₺' + Math.abs(v).toLocaleString('tr-TR', { maximumFractionDigits: 0 });
    const formatPct = (v: number) => `%${v.toFixed(1)}`;

    // SVG mini chart for cash flow
    const chartW = 380;
    const chartH = 120;
    const pad = { l: 50, r: 10, t: 10, b: 25 };
    const cW = chartW - pad.l - pad.r;
    const cH = chartH - pad.t - pad.b;

    const cfData = financial.cashFlows;
    const maxCum = Math.max(...cfData.map(c => c.cumulative), 0);
    const minCum = Math.min(...cfData.map(c => c.cumulative), 0);
    const cumRange = maxCum - minCum || 1;

    const toX = (i: number) => pad.l + (i / Math.max(cfData.length - 1, 1)) * cW;
    const toY = (v: number) => pad.t + cH - ((v - minCum) / cumRange) * cH;
    const zeroY = toY(0);

    const cumPath = cfData.map((c, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(c.cumulative).toFixed(1)}`).join(' ');

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h5 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--card-title)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                💰 Finansal Modelleme
            </h5>

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px' }}>
                {[
                    { label: 'Net Kâr', value: formatTL(financial.netProfit), color: financial.netProfit >= 0 ? 'var(--green)' : 'var(--red)', bg: financial.netProfit >= 0 ? 'rgba(var(--green-rgb),0.08)' : 'rgba(var(--red-rgb),0.08)' },
                    { label: 'ROI', value: formatPct(financial.roi), color: 'var(--primary)', bg: 'rgba(var(--primary-rgb),0.08)' },
                    { label: 'IRR', value: formatPct(financial.irr), color: 'var(--orange)', bg: 'rgba(var(--orange-rgb),0.08)' },
                    { label: 'NPV', value: formatTL(financial.npv), color: financial.npv >= 0 ? 'var(--green)' : 'var(--red)', bg: financial.npv >= 0 ? 'rgba(var(--green-rgb),0.08)' : 'rgba(var(--red-rgb),0.08)' },
                    { label: 'Geri Ödeme', value: `${financial.paybackMonth} ay`, color: 'var(--primary)', bg: 'rgba(var(--primary-rgb),0.08)' },
                ].map((kpi, i) => (
                    <div key={i} style={{ padding: '10px', borderRadius: '12px', background: kpi.bg, border: `1px solid ${kpi.bg}`, textAlign: 'center' }}>
                        <div style={{ fontSize: '0.65rem', color: 'var(--muted)', fontWeight: 700, marginBottom: '2px' }}>{kpi.label}</div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 900, color: kpi.color }}>{kpi.value}</div>
                    </div>
                ))}
            </div>

            {/* Nakit Akışı Grafiği */}
            <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--label-color)', marginBottom: '6px' }}>📈 Kümülatif Nakit Akışı</div>
                <svg width="100%" viewBox={`0 0 ${chartW} ${chartH}`} style={{ overflow: 'visible' }}>
                    {/* Zero line */}
                    <line x1={pad.l} y1={zeroY} x2={chartW - pad.r} y2={zeroY} stroke="var(--border)" strokeWidth="0.5" strokeDasharray="4,3" />
                    <text x={pad.l - 5} y={zeroY + 3} fill="var(--muted)" fontSize="7" textAnchor="end">₺0</text>

                    {/* Gradient */}
                    <defs>
                        <linearGradient id="cfGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--green)" stopOpacity="0.15" />
                            <stop offset="100%" stopColor="var(--red)" stopOpacity="0.1" />
                        </linearGradient>
                    </defs>

                    {/* Area fill */}
                    <path d={`${cumPath} L${toX(cfData.length - 1).toFixed(1)},${zeroY} L${pad.l},${zeroY} Z`} fill="url(#cfGrad)" />

                    {/* Line */}
                    <path d={cumPath} fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" />

                    {/* Construction period marker */}
                    <rect x={pad.l} y={pad.t} width={(constructionMonths / cfData.length) * cW} height={cH} fill="rgba(var(--red-rgb),0.05)" />

                    {/* Labels */}
                    <text x={pad.l} y={chartH - 3} fill="var(--muted)" fontSize="7" fontWeight="600">1. ay</text>
                    <text x={chartW - pad.r} y={chartH - 3} fill="var(--muted)" fontSize="7" fontWeight="600" textAnchor="end">{cfData.length}. ay</text>

                    {/* End point */}
                    <circle cx={toX(cfData.length - 1)} cy={toY(cfData[cfData.length - 1]?.cumulative || 0)} r="4" fill="var(--green)" stroke="white" strokeWidth="1.5" />
                </svg>
            </div>

            {/* Parametreler */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--muted)' }}>İnşaat Süresi</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <input type="range" min="6" max="36" value={constructionMonths} onChange={e => setConstructionMonths(Number(e.target.value))} style={{ flex: 1, accentColor: 'var(--primary)' }} />
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--val-color)', minWidth: '35px' }}>{constructionMonths} ay</span>
                    </div>
                </div>
                <div>
                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--muted)' }}>Satış Süresi</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <input type="range" min="3" max="24" value={sellingMonths} onChange={e => setSellingMonths(Number(e.target.value))} style={{ flex: 1, accentColor: 'var(--primary)' }} />
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--val-color)', minWidth: '35px' }}>{sellingMonths} ay</span>
                    </div>
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--muted)' }}>İskonto Oranı (yıllık)</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <input type="range" min="5" max="60" value={discountRate} onChange={e => setDiscountRate(Number(e.target.value))} style={{ flex: 1, accentColor: 'var(--orange)' }} />
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--orange)', minWidth: '35px' }}>%{discountRate}</span>
                    </div>
                </div>
            </div>

            {/* Banka Kredisi */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--card-title)' }}>🏦 Banka Kredisi</span>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={useLoan} onChange={e => setUseLoan(e.target.checked)} style={{ accentColor: 'var(--primary)' }} />
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)' }}>Aktif</span>
                    </label>
                </div>

                {useLoan && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <div>
                                <label style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--muted)' }}>Kredi Oranı</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <input type="range" min="10" max="100" value={loanPercent} onChange={e => setLoanPercent(Number(e.target.value))} style={{ flex: 1, accentColor: 'var(--primary)' }} />
                                    <span style={{ fontSize: '0.75rem', fontWeight: 800, minWidth: '30px' }}>%{loanPercent}</span>
                                </div>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--muted)' }}>Faiz (yıllık)</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <input type="range" min="10" max="80" value={loanRate} onChange={e => setLoanRate(Number(e.target.value))} style={{ flex: 1, accentColor: 'var(--red)' }} />
                                    <span style={{ fontSize: '0.75rem', fontWeight: 800, minWidth: '30px' }}>%{loanRate}</span>
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <div>
                                <label style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--muted)' }}>Vade</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <input type="range" min="6" max="120" step="6" value={loanTermMonths} onChange={e => setLoanTermMonths(Number(e.target.value))} style={{ flex: 1, accentColor: 'var(--primary)' }} />
                                    <span style={{ fontSize: '0.75rem', fontWeight: 800, minWidth: '35px' }}>{loanTermMonths} ay</span>
                                </div>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--muted)' }}>Taksit Tipi</label>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                    {(['annuity', 'equal'] as const).map(t => (
                                        <button key={t} onClick={() => setLoanType(t)} style={{
                                            flex: 1,
                                            padding: '4px 6px',
                                            borderRadius: '8px',
                                            border: `1px solid ${loanType === t ? 'var(--primary)' : 'var(--border)'}`,
                                            background: loanType === t ? 'var(--primary)' : 'transparent',
                                            color: loanType === t ? 'white' : 'var(--text)',
                                            fontWeight: 700,
                                            fontSize: '0.7rem',
                                            cursor: 'pointer',
                                            fontFamily: 'inherit',
                                        }}>
                                            {t === 'annuity' ? 'Eşit Taksit' : 'Eşit Anapara'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Loan Results */}
                        {loan && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginTop: '4px' }}>
                                <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(var(--red-rgb),0.06)', textAlign: 'center' }}>
                                    <div style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--muted)' }}>Aylık Taksit</div>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 900, color: 'var(--red)' }}>{formatTL(loan.monthlyPayment)}</div>
                                </div>
                                <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(var(--orange-rgb),0.06)', textAlign: 'center' }}>
                                    <div style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--muted)' }}>Toplam Faiz</div>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 900, color: 'var(--orange)' }}>{formatTL(loan.totalInterest)}</div>
                                </div>
                                <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(var(--primary-rgb),0.06)', textAlign: 'center' }}>
                                    <div style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--muted)' }}>Efektif Maliyet</div>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 900, color: 'var(--primary)' }}>{formatPct(loan.effectiveRate)}</div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
