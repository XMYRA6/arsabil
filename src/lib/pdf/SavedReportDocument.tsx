import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';
import {
  buildSavedReportHero,
  buildSavedReportRows,
  SavedReportInput,
} from './savedReportContent';

export type { SavedReportInput };

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
  white:     '#FFFFFF',
  offWhite:  '#F7F8FC',
  lightGray: '#EEF1F8',
  border:    '#DDE3F0',
  muted:     '#8B9BB4',
  dark:      '#0D1230',
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
  accentBar: { height: 3, backgroundColor: C.violet },

  /* ── Hero metrics strip ── */
  heroStrip: {
    flexDirection: 'row',
    backgroundColor: C.offWhite,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingHorizontal: 28,
    paddingVertical: 16,
    marginTop: 12,
    gap: 10,
  },
  heroCardPrimary: {
    flex: 1,
    backgroundColor: C.navy,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: C.navyMid,
  },
  heroCard: {
    flex: 1,
    backgroundColor: C.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
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

  /* ── Body ── */
  body: { paddingHorizontal: 28, paddingTop: 18, paddingBottom: 8 },
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
  footerBrand: { fontSize: 8, fontWeight: 700, color: C.violet },
});

/* ── Sub-components ── */
function DataRow({ label, value, alt }: { label: string; value: string; alt?: boolean }) {
  return (
    <View style={alt ? s.dataRowAlt : s.dataRow}>
      <Text style={s.dataLabel}>{label}</Text>
      <Text style={s.dataValue}>{value}</Text>
    </View>
  );
}

/* ── Main Document ──
   Kayitli bir raporun PDF ozeti (spec K6). Hesaplama motorunun ureteci
   (`ReportDocument`) ile GORSEL OLARAK ayni urun ailesindendir (ayni
   header/accent bar/hero-kart/veri-satiri dili), ama icerik olarak
   tamamen farklidir: burada yalnizca Report DB kaydinin sakladigi 7 alan
   basilir. Risk payi, muteahhit kari, iksa, piyasa fiyati ve motorun
   hesaplama ciktilari (M, FD_total disinda) bu kayitta hic yok — bu
   yuzden sifir/bos satir olarak degil, TAMAMEN YOK sayilarak atlanir.
 */
export function SavedReportDocument({ input }: { input: SavedReportInput }) {
  const hero = buildSavedReportHero(input);
  const rows = buildSavedReportRows(input);
  const today = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <Document title={`ArsaBil Rapor Özeti - ${input.title}`} author="ArsaBil">
      <Page size="A4" style={s.page}>

        {/* Header */}
        <View style={s.header}>
          <View>
            <View style={s.brandRow}>
              <Text style={s.brandName}>ArsaBil</Text>
              <Text style={s.brandTag}>RAPOR ÖZETİ</Text>
            </View>
            <Text style={s.headerSubtitle}>Kayıtlı Rapor Özeti</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.headerDate}>{today}</Text>
            <Text style={s.headerEngine}>arsabil.com</Text>
          </View>
        </View>
        <View style={s.accentBar} />

        {/* Hero Metrics */}
        <View style={s.heroStrip}>
          <View style={s.heroCardPrimary}>
            <Text style={s.metricLabelLight}>{hero[0].label}</Text>
            <Text style={s.metricValueLight}>{hero[0].value}</Text>
          </View>
          <View style={s.heroCard}>
            <Text style={s.metricLabel}>{hero[1].label}</Text>
            <Text style={s.metricValue}>{hero[1].value}</Text>
          </View>
        </View>

        {/* Body */}
        <View style={s.body}>
          <Text style={s.sectionLabel}>Rapor Bilgileri</Text>
          {rows.map((row, i) => (
            <DataRow key={row.label} label={row.label} value={row.value} alt={i % 2 === 1} />
          ))}
        </View>

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.footerText}>
            Bu belge, kayıtlı raporun kaydedilen verilerinden oluşturulmuş bir özettir;
            detaylı fizibilite hesaplaması içermez. Hukuki veya mali belge niteliğinde değildir.
          </Text>
          <Text style={s.footerBrand}>arsabil.com</Text>
        </View>

      </Page>
    </Document>
  );
}
