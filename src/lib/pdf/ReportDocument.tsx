import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';
import { CalculationOutput } from '@/lib/calculator/engine_v2';

// Roboto: full Turkish/Unicode support (ş ğ ı ç ö ü İ Ğ Ş Ü Ö)
Font.register({
  family: 'Roboto',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxP.ttf', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlfBBc9.ttf', fontWeight: 700 },
  ],
});

Font.registerHyphenationCallback(word => [word]);

const C = {
  navy:      '#0B2443',
  navyMid:   '#112d54',
  violet:    '#1f6feb',
  violetLt:  '#8b7cf8',
  cyan:      '#2b7cff',
  blue:      '#134ea5',
  white:     '#FFFFFF',
  offWhite:  '#F7F8FC',
  lightGray: '#EEF1F8',
  border:    '#DDE3F0',
  muted:     '#8B9BB4',
  dark:      '#0D1230',
  green:     '#16a34a',
  amber:     '#f59e0b',
  red:       '#ef4444',
};

const s = StyleSheet.create({
  page: {
    fontFamily: 'Roboto',
    fontSize: 9,
    color: C.dark,
    backgroundColor: C.white,
    flexDirection: 'column',
  },

  /* ── Header ── */
  header: {
    backgroundColor: C.navy,
    paddingHorizontal: 28,
    paddingTop: 22,
    paddingBottom: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  brandRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  brandName: { fontSize: 22, fontWeight: 700, color: C.white, letterSpacing: 0.3 },
  brandTag: {
    fontSize: 7,
    fontWeight: 700,
    color: C.violet,
    backgroundColor: 'rgba(109,91,246,0.20)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    letterSpacing: 0.5,
    marginLeft: 8,
  },
  headerSubtitle: { fontSize: 8.5, color: 'rgba(255,255,255,0.55)', marginTop: 4 },
  headerRight: { alignItems: 'flex-end' },
  headerDate: { fontSize: 8, color: 'rgba(255,255,255,0.45)', marginBottom: 2 },
  headerEngine: { fontSize: 7.5, fontWeight: 700, color: C.violet, letterSpacing: 0.4 },

  /* ── Accent bar ── */
  accentBar: {
    height: 3,
    backgroundColor: C.violet,
  },

  /* ── Hero metrics strip ── */
  heroStrip: {
    flexDirection: 'row',
    backgroundColor: C.offWhite,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingHorizontal: 28,
    paddingVertical: 16,
    gap: 10,
  },
  heroCard: {
    flex: 1,
    backgroundColor: C.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    padding: 12,
  },
  heroCardPrimary: {
    flex: 1.4,
    backgroundColor: C.navy,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: C.navyMid,
  },
  heroCardViolet: {
    flex: 1,
    backgroundColor: C.violet,
    borderRadius: 8,
    padding: 12,
  },
  metricLabel: {
    fontSize: 6.5,
    color: C.muted,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    marginBottom: 5,
    fontWeight: 700,
  },
  metricLabelLight: {
    fontSize: 6.5,
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    marginBottom: 5,
    fontWeight: 700,
  },
  metricValue: { fontSize: 17, fontWeight: 700, color: C.dark, letterSpacing: -0.3 },
  metricValueLight: { fontSize: 17, fontWeight: 700, color: C.white, letterSpacing: -0.3 },
  metricSub: { fontSize: 7.5, color: C.muted, marginTop: 3 },
  metricSubLight: { fontSize: 7.5, color: 'rgba(255,255,255,0.6)', marginTop: 3 },

  /* ── Body ── */
  body: {
    flexDirection: 'row',
    paddingHorizontal: 28,
    paddingTop: 18,
    paddingBottom: 8,
    gap: 18,
  },
  col: { flex: 1 },

  sectionLabel: {
    fontSize: 7,
    fontWeight: 700,
    color: C.muted,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },

  /* ── Data rows ── */
  dataRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: C.lightGray,
  },
  dataRowAlt: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 4,
    backgroundColor: C.offWhite,
    borderBottomWidth: 1,
    borderBottomColor: C.lightGray,
  },
  dataLabel: { flex: 1.3, fontSize: 8, color: C.muted },
  dataValue: { flex: 1, fontSize: 8, fontWeight: 700, color: C.dark, textAlign: 'right' },
  dataValueHighlight: { flex: 1, fontSize: 8, fontWeight: 700, color: C.violet, textAlign: 'right' },

  /* ── Breakdown ── */
  breakdownSection: {
    paddingHorizontal: 28,
    paddingBottom: 18,
  },
  barContainer: { marginBottom: 9 },
  barHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  barLabelText: { fontSize: 8, color: C.dark, fontWeight: 700 },
  barMeta: { fontSize: 7.5, color: C.muted },
  barTrack: {
    height: 8,
    backgroundColor: C.lightGray,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: { height: 8, borderRadius: 4 },

  /* ── Divider ── */
  divider: { borderTopWidth: 1, borderTopColor: C.border, marginHorizontal: 28, marginVertical: 4 },

  /* ── Footer ── */
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
    marginTop: 'auto',
  },
  footerText: { fontSize: 7, color: C.muted, flex: 1 },
  footerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  footerBrand: { fontSize: 8, fontWeight: 700, color: C.violet },
  footerPage: { fontSize: 7, color: C.muted },
});

/* ── Types ── */
export interface ReportInput {
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
  result: CalculationOutput;
}

/* ── Helpers ── */
const fmt  = (n: number) => n.toLocaleString('tr-TR', { maximumFractionDigits: 0 });
const fmtTL = (n: number) => `${fmt(n)} TL`;
const luxLabels: Record<number, string> = { 1.0: 'Standart', 1.2: 'Orta', 1.4: 'Lüks' };

function iksaLabel(input: ReportInput): string {
  if (input.iksaMode === 'off') return 'Yok';
  if (input.iksaMode === 'percentage') return `%${input.iksaPercentage}`;
  return fmtTL(input.iksaManualTL ?? 0);
}

/* ── Sub-components ── */
function DataRow({ label, value, alt, highlight }: { label: string; value: string; alt?: boolean; highlight?: boolean }) {
  return (
    <View style={alt ? s.dataRowAlt : s.dataRow}>
      <Text style={s.dataLabel}>{label}</Text>
      <Text style={highlight ? s.dataValueHighlight : s.dataValue}>{value}</Text>
    </View>
  );
}

function BarRow({ label, value, amount, pct, color }: { label: string; value: string; amount: string; pct: number; color: string }) {
  const w = `${Math.max(pct, 1.5)}%`;
  return (
    <View style={s.barContainer}>
      <View style={s.barHeader}>
        <Text style={s.barLabelText}>{label}</Text>
        <Text style={s.barMeta}>{amount}  •  {value}</Text>
      </View>
      <View style={s.barTrack}>
        <View style={[s.barFill, { width: w, backgroundColor: color }]} />
      </View>
    </View>
  );
}

/* ── Main Document ── */
export function ReportDocument({ input }: { input: ReportInput }) {
  const { result: r } = input;
  const today = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

  const profit   = r.FD_total - r.M;
  const riskCost = Math.max(r.Mi - r.Mi_base - r.Mz, 0);
  const total    = r.FD_total || 1;

  const breakdown = [
    { label: 'İnşaat Maliyeti', amount: r.Mi_base, color: C.violet },
    { label: 'Arsa Maliyeti',   amount: r.Ma,       color: C.blue   },
    { label: 'Müteahhit Kârı', amount: profit,     color: C.cyan   },
    { label: 'İksa Masrafı',   amount: r.Mz,       color: C.violetLt },
    { label: 'Risk Payı',      amount: riskCost,   color: C.amber  },
  ].filter(b => b.amount > 0.5);

  return (
    <Document title="ArsaBil Fizibilite Raporu" author="ArsaBil Engine v2">
      <Page size="A4" style={s.page}>

        {/* Header */}
        <View style={s.header}>
          <View>
            <View style={s.brandRow}>
              <Text style={s.brandName}>ArsaBil</Text>
              <Text style={s.brandTag}>ENGINE V2</Text>
            </View>
            <Text style={s.headerSubtitle}>Arsa Payı ve Kat Karşılığı Fizibilite Raporu</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.headerDate}>{today}</Text>
            <Text style={s.headerEngine}>arsabil.com</Text>
          </View>
        </View>
        <View style={s.accentBar} />

        {/* Hero Metrics */}
        <View style={s.heroStrip}>
          {/* Primary: Daire Fiyatı */}
          <View style={s.heroCardPrimary}>
            <Text style={s.metricLabelLight}>Daire Fiyatı</Text>
            <Text style={s.metricValueLight}>{fmtTL(r.FD_total)}</Text>
            <Text style={s.metricSubLight}>{fmt(r.FD_per_m2)} TL/m²</Text>
          </View>

          {/* Toplam Maliyet */}
          <View style={s.heroCard}>
            <Text style={s.metricLabel}>Toplam Maliyet</Text>
            <Text style={s.metricValue}>{fmtTL(r.M)}</Text>
            <Text style={s.metricSub}>İnşaat + Arsa</Text>
          </View>

          {/* Arsa Değeri (varsa) */}
          {r.FA !== null && (
            <View style={s.heroCardViolet}>
              <Text style={s.metricLabelLight}>Arsa Değeri</Text>
              <Text style={s.metricValueLight}>{fmtTL(r.FA ?? 0)}</Text>
              {r.FAbirim !== null && (
                <Text style={s.metricSubLight}>{fmt(r.FAbirim ?? 0)} TL/m²</Text>
              )}
            </View>
          )}

          {/* Arsa Sahibi Payı (varsa) */}
          {r.Sdx !== null && (
            <View style={s.heroCard}>
              <Text style={s.metricLabel}>Arsa Sahibi Payı</Text>
              <Text style={s.metricValue}>{Number(r.Sdx).toFixed(1)}</Text>
              <Text style={s.metricSub}>Daire • %{input.landShareRatio} pay</Text>
            </View>
          )}
        </View>

        {/* Two-column body */}
        <View style={s.body}>
          {/* Left: Inputs */}
          <View style={s.col}>
            <Text style={s.sectionLabel}>Girdi Parametreleri</Text>
            <DataRow label="Daire Standardı"   value={luxLabels[input.luxLevel] ?? `x${input.luxLevel}`} />
            <DataRow label="Daire Alanı"        value={`${input.apartmentSize} m²`}          alt />
            <DataRow label="Arsa Payı"          value={`%${input.landShareRatio}`} />
            <DataRow label="Müteahhit Kârı"    value={`x${input.builderProfit}`}             alt />
            <DataRow label="Risk Payı"          value={input.riskLevel > 0 ? `%${input.riskLevel}` : 'Yok'} />
            <DataRow label="İksa Masrafı"       value={iksaLabel(input)}                     alt />
            {input.totalApartments != null && (
              <DataRow label="Toplam Daire"     value={`${input.totalApartments} daire`} />
            )}
            {input.arsaAlani != null && (
              <DataRow label="Arsa Alanı"       value={`${input.arsaAlani} m²`}              alt />
            )}
            {input.marketPrice > 0 && (
              <DataRow label="Piyasa Fiyatı"    value={fmtTL(input.marketPrice)} />
            )}
          </View>

          {/* Right: Results */}
          <View style={s.col}>
            <Text style={s.sectionLabel}>Hesaplama Sonuclari</Text>
            <DataRow label="Ham İnşaat (Mi_base)"    value={fmtTL(r.Mi_base)} />
            <DataRow label="İksa Tutarı (Mz)"        value={fmtTL(r.Mz)}       alt />
            <DataRow label="Toplam İnşaat (Mi)"      value={fmtTL(r.Mi)} />
            <DataRow label="Arsa Maliyeti (Ma)"      value={fmtTL(r.Ma)}        alt />
            <DataRow label="Genel Toplam (M)"        value={fmtTL(r.M)} />
            <DataRow label="Daire Fiyatı (FD)"       value={fmtTL(r.FD_total)}  alt highlight />
            <DataRow label="Birim Fiyat"             value={`${fmt(r.FD_per_m2)} TL/m²`} />
            {r.Sdx !== null && (
              <DataRow label="Arsa Sahibi Payı"      value={`${Number(r.Sdx).toFixed(1)} daire`} alt />
            )}
            {r.FA !== null && (
              <DataRow label="Arsa Fiyatı (FA)"      value={fmtTL(r.FA ?? 0)} />
            )}
            {r.FAbirim !== null && (
              <DataRow label="Arsa Birimi (FAbirim)"  value={`${fmt(r.FAbirim ?? 0)} TL/m²`} alt />
            )}
          </View>
        </View>

        {/* Cost breakdown bars */}
        {breakdown.length > 0 && (
          <>
            <View style={s.divider} />
            <View style={s.breakdownSection}>
              <Text style={[s.sectionLabel, { marginBottom: 12 }]}>Maliyet Dağılımı</Text>
              {breakdown.map(b => (
                <BarRow
                  key={b.label}
                  label={b.label}
                  amount={fmtTL(b.amount)}
                  value={`%${((b.amount / total) * 100).toFixed(1)}`}
                  pct={(b.amount / total) * 100}
                  color={b.color}
                />
              ))}
            </View>
          </>
        )}

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.footerText}>
            Bu rapor ArsaBil Engine v2 tarafından otomatik oluşturulmuştur. Bilgi amaçlıdır, hukuki veya mali belge niteliğinde değildir.
          </Text>
          <View style={s.footerRight}>
            <Text style={s.footerBrand}>arsabil.com</Text>
          </View>
        </View>

      </Page>
    </Document>
  );
}
