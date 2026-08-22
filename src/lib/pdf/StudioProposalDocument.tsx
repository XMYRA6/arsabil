import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Image,
} from '@react-pdf/renderer';
import type { StudioProposalViewModel } from '@/lib/studio/proposalViewModel';

Font.register({
  family: 'Roboto',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxP.ttf', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlfBBc9.ttf', fontWeight: 700 },
  ],
});

Font.registerHyphenationCallback((word) => [word]);

const C = {
  navy: '#0B2443',
  navyMid: '#112d54',
  blue: '#0284c7',
  blueLt: '#e0f2fe',
  white: '#FFFFFF',
  offWhite: '#F8FAFC',
  border: '#E2E8F0',
  borderDark: '#CBD5E1',
  muted: '#64748B',
  dark: '#0F172A',
  green: '#16A34A',
  amber: '#D97706',
};

const s = StyleSheet.create({
  page: {
    fontFamily: 'Roboto',
    fontSize: 9,
    color: C.dark,
    backgroundColor: C.white,
    flexDirection: 'column',
    paddingBottom: 24,
  },
  header: {
    backgroundColor: C.navy,
    paddingHorizontal: 28,
    paddingTop: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandName: {
    fontSize: 16,
    fontWeight: 700,
    color: C.white,
  },
  headerSubtitle: {
    fontSize: 8,
    color: '#94a3b8',
    marginTop: 2,
  },
  headerBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  headerBadgeText: {
    fontSize: 8,
    color: C.white,
    fontWeight: 700,
  },
  body: {
    paddingHorizontal: 28,
    paddingTop: 16,
    flexDirection: 'column',
    gap: 14,
  },
  titleBlock: {
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingBottom: 10,
  },
  scenarioTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: C.dark,
  },
  metaText: {
    fontSize: 8,
    color: C.muted,
    marginTop: 3,
  },
  section: {
    flexDirection: 'column',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: C.navyMid,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingBottom: 3,
  },
  grid2: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: C.offWhite,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 4,
    padding: 8,
  },
  statLabel: {
    fontSize: 7.5,
    color: C.muted,
  },
  statValue: {
    fontSize: 11,
    fontWeight: 700,
    color: C.dark,
    marginTop: 2,
  },
  statHint: {
    fontSize: 6.5,
    color: '#94a3b8',
    marginTop: 1,
  },
  visualBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 4,
    backgroundColor: C.offWhite,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    maxHeight: 140,
  },
  svgImage: {
    width: '100%',
    height: 120,
    objectFit: 'contain',
  },
  table: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: C.offWhite,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  tableRowLast: {
    flexDirection: 'row',
    backgroundColor: C.offWhite,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  col1: { flex: 2, fontSize: 8 },
  col2: { flex: 1, fontSize: 8, textAlign: 'right' },
  col3: { flex: 1, fontSize: 8, textAlign: 'right' },
  col4: { flex: 1.5, fontSize: 8, textAlign: 'right', fontWeight: 700 },
  offerBox: {
    backgroundColor: C.blueLt,
    borderWidth: 1,
    borderColor: '#bae6fd',
    borderRadius: 4,
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  offerMain: {
    flex: 1,
  },
  offerLabel: {
    fontSize: 8,
    color: '#0369a1',
    fontWeight: 700,
  },
  offerValue: {
    fontSize: 14,
    fontWeight: 700,
    color: C.blue,
    marginTop: 2,
  },
  offerDetails: {
    flex: 1.5,
    flexDirection: 'column',
    gap: 3,
  },
  offerDetailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
  },
  assumptionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  assumptionCard: {
    flex: 1,
    backgroundColor: C.offWhite,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 4,
    padding: 6,
  },
  footer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: C.border,
    flexDirection: 'column',
    gap: 4,
  },
  disclaimer: {
    fontSize: 6.5,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 1.3,
  },
});

export interface StudioProposalDocumentProps {
  viewModel: StudioProposalViewModel;
  svgDataUri?: string;
}

export function StudioProposalDocument({ viewModel, svgDataUri }: StudioProposalDocumentProps) {
  const {
    projectContext,
    massingAnd2D,
    programSummary,
    landownerOfferSummary,
    financialAssumptions,
    warningsAndBadges,
  } = viewModel;

  return (
    <Document title={`${projectContext.scenarioName} - Teklif Raporu`} author="ArsaBil Studio">
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.brandName}>ArsaBil Studio</Text>
            <Text style={s.headerSubtitle}>Ön Fizibilite ve Teklif Senaryosu</Text>
          </View>
          <View style={s.headerBadge}>
            <Text style={s.headerBadgeText}>
              v{projectContext.versionNumber} · {warningsAndBadges.sourceBadgeLabel}
            </Text>
          </View>
        </View>

        {/* Body */}
        <View style={s.body}>
          {/* Title & Metadata */}
          <View style={s.titleBlock}>
            <Text style={s.scenarioTitle}>{projectContext.scenarioName}</Text>
            <Text style={s.metaText}>
              {projectContext.parcelIdentity
                ? `${projectContext.parcelIdentity.il} / ${projectContext.parcelIdentity.ilce} / ${projectContext.parcelIdentity.mahalle} ${projectContext.parcelIdentity.adaNo}/${projectContext.parcelIdentity.parselNo}`
                : 'Parsel Konumu: Serbest Taslak'}
              {' · '}
              Rapor Tarihi: {projectContext.createdAtFormatted}
            </Text>
          </View>

          {/* 1. Yapı ve 2D Yerleşim */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>1. Yapı ve 2D Yerleşim Özeti</Text>
            <View style={s.grid2}>
              {svgDataUri ? (
                <View style={s.visualBox}>
                  <Image src={svgDataUri} style={s.svgImage} />
                </View>
              ) : null}
              <View style={{ flex: 1, flexDirection: 'column', gap: 6 }}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <View style={s.statCard}>
                    <Text style={s.statLabel}>Parsel Alanı</Text>
                    <Text style={s.statValue}>{projectContext.parcelAreaM2.toLocaleString('tr-TR')} m²</Text>
                  </View>
                  <View style={s.statCard}>
                    <Text style={s.statLabel}>Toplam İnşaat</Text>
                    <Text style={s.statValue}>{projectContext.grossConstructionAreaM2.toLocaleString('tr-TR')} m²</Text>
                    <Text style={s.statHint}>{projectContext.grossConstructionAreaSource}</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <View style={s.statCard}>
                    <Text style={s.statLabel}>Bina Taban (TAKS)</Text>
                    <Text style={s.statValue}>
                      {massingAnd2D.footprintAreaM2.toLocaleString('tr-TR')} m² (%{massingAnd2D.coveragePercentage})
                    </Text>
                  </View>
                  <View style={s.statCard}>
                    <Text style={s.statLabel}>Kat / Yükseklik</Text>
                    <Text style={s.statValue}>
                      {massingAnd2D.floorCount} Kat / {massingAnd2D.buildingHeightM}m
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* 2. Program Dağılımı */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>2. Fonksiyon ve Program Dağılımı</Text>
            <View style={s.table}>
              <View style={s.tableHeaderRow}>
                <Text style={[s.col1, { fontWeight: 700, color: C.muted }]}>Fonksiyon</Text>
                <Text style={[s.col2, { fontWeight: 700, color: C.muted }]}>Birim Adedi</Text>
                <Text style={[s.col3, { fontWeight: 700, color: C.muted }]}>Ort. Alan</Text>
                <Text style={[s.col4, { fontWeight: 700, color: C.muted }]}>Toplam Tahsis</Text>
              </View>
              {programSummary.items.map((item, idx) => (
                <View key={idx} style={s.tableRow}>
                  <Text style={s.col1}>{item.useLabel}</Text>
                  <Text style={s.col2}>{item.unitCount} adet</Text>
                  <Text style={s.col3}>{item.averageUnitAreaM2} m²</Text>
                  <Text style={s.col4}>{item.allocatedAreaM2.toLocaleString('tr-TR')} m²</Text>
                </View>
              ))}
              <View style={s.tableRowLast}>
                <Text style={[s.col1, { fontWeight: 700 }]}>Toplam Tahsis</Text>
                <Text style={[s.col2, { fontWeight: 700 }]}>
                  {programSummary.residentialUnitCount + programSummary.commercialUnitCount} bağımsız bölüm
                </Text>
                <Text style={s.col3}>—</Text>
                <Text style={s.col4}>{programSummary.totalAllocatedAreaM2.toLocaleString('tr-TR')} m²</Text>
              </View>
            </View>
          </View>

          {/* 3. Arsa Sahibi Teklifi */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>3. Arsa Sahibi Teklif Özeti</Text>
            <View style={s.offerBox}>
              <View style={s.offerMain}>
                <Text style={s.offerLabel}>Hesaplanan Hak Ediş</Text>
                <Text style={s.offerValue}>{landownerOfferSummary.entitledUnitCount.toFixed(2)} Daire</Text>
              </View>
              <View style={s.offerDetails}>
                <View style={s.offerDetailItem}>
                  <Text style={{ color: C.muted }}>Önerilen Tam Bölüm:</Text>
                  <Text style={{ fontWeight: 700 }}>{landownerOfferSummary.offeredWholeUnits} Daire</Text>
                </View>
                {landownerOfferSummary.fractionalUnitBalance !== 0 ? (
                  <View style={s.offerDetailItem}>
                    <Text style={{ color: C.muted }}>Kesirli Pay Dengesi:</Text>
                    <Text style={{ fontWeight: 700 }}>
                      {landownerOfferSummary.fractionalUnitBalance > 0
                        ? `+${landownerOfferSummary.fractionalUnitBalance.toFixed(2)} daire payı`
                        : `${landownerOfferSummary.fractionalUnitBalance.toFixed(2)} daire payı`}
                    </Text>
                  </View>
                ) : null}
                {landownerOfferSummary.cashEqualizationTl != null ? (
                  <View style={s.offerDetailItem}>
                    <Text style={{ color: C.muted }}>Nakit Dengeleme / Mahsup:</Text>
                    <Text style={{ fontWeight: 700, color: C.green }}>
                      {landownerOfferSummary.cashEqualizationTl.toLocaleString('tr-TR')} TL
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>

          {/* 4. Değerleme Parametreleri */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>4. Değerleme ve Finansal Parametreler</Text>
            <View style={s.assumptionsRow}>
              <View style={s.assumptionCard}>
                <Text style={s.statLabel}>Daire Satış Değeri (Ortalama)</Text>
                <Text style={[s.statValue, { fontSize: 9.5 }]}>
                  {financialAssumptions.unitValueTl != null
                    ? `${financialAssumptions.unitValueTl.toLocaleString('tr-TR')} ${financialAssumptions.currency}`
                    : 'Belirtilmedi'}
                </Text>
              </View>
              <View style={s.assumptionCard}>
                <Text style={s.statLabel}>Dükkan / Ticari Satış Değeri</Text>
                <Text style={[s.statValue, { fontSize: 9.5 }]}>
                  {financialAssumptions.shopValueTl != null
                    ? `${financialAssumptions.shopValueTl.toLocaleString('tr-TR')} ${financialAssumptions.currency}`
                    : 'Belirtilmedi'}
                </Text>
              </View>
              <View style={s.assumptionCard}>
                <Text style={s.statLabel}>Değerleme Tarihi</Text>
                <Text style={[s.statValue, { fontSize: 9.5 }]}>
                  {financialAssumptions.valuationDate || 'Belirtilmedi'}
                </Text>
              </View>
            </View>
          </View>

          {/* Footer & Disclaimer */}
          <View style={s.footer}>
            <Text style={s.disclaimer}>{landownerOfferSummary.disclaimerText}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
