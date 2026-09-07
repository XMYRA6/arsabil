// TÜİK SDMX demografi — dataflow konfigürasyonu.
//
// Task 1 (SDMX introspection, 2026-09-07) canlı API'ye karşı doğrulandı —
// bkz. crawler/tuik/FINDINGS.md. Spec rev 2'nin bazı varsayımları düzeltildi:
//   - Coğrafya REF_AREA'da DEĞİL IKAMET_YERI boyutunda (REF_AREA hep "TR").
//   - 4 dataflow tek DSD_ADNKS v1.7 paylaşır (21 boyut), hepsi dataflow v1.1.
//   - SDMX-CSV yalnız `Accept: application/vnd.sdmx.data+csv` başlığıyla gelir.
//   - Anahtarsız çekilir, istenmeyen kırılım satırları `rowFilter` ile elenir.

export const TOKEN_URL =
  'https://giris.tuik.gov.tr/realms/web/protocol/openid-connect/token'
export const DATA_BASE = 'https://nsiws.tuik.gov.tr/rest/data/TR'

export type DemographicField =
  | 'population'
  | 'populationGrowthPerMille'
  | 'medianAge'
  | 'avgHouseholdSize'

export interface DataflowRef {
  /** kısa ad — log / CrawlRun.notes */
  key: string
  /** "DF_ADNKS_T22" */
  dataflow: string
  /** Task 1'de doğrulandı — hepsi "1.1" */
  version: string
  field: DemographicField
  /** T22/T38 ilçe; T23/T25 il (ilin tüm ilçelerine yayılır) */
  level: 'il' | 'ilce'
  /**
   * IKAMET_YERI ve TIME_PERIOD dışı boyutlar için istenen sabit değerler —
   * `parseSdmxCsv`'e `filter` olarak geçer, sağlanmayan satır atılır.
   * `ADNKS_GOSTERGE` dataflow'da zaten pinli ama açıklık için burada; `SEX` /
   * `YERLESIM_YERI_TUR` cinsiyet/kentsel-kırsal kırılım satırlarını eler.
   * Bkz. FINDINGS.md "Dataflow'lar + DSD".
   */
  rowFilter: Record<string, string>
}

/** En güncel tam yıl — Task 1'de doğrulandı (2025 ADNKS 4 dataflow'da da var). */
export const DATA_YEAR = 2025

export const DATAFLOWS: DataflowRef[] = [
  {
    key: 'population',
    dataflow: 'DF_ADNKS_T22',
    version: '1.1',
    field: 'population',
    level: 'ilce',
    rowFilter: { ADNKS_GOSTERGE: 'NUFUS', YERLESIM_YERI_TUR: '_T' },
  },
  {
    key: 'growth',
    dataflow: 'DF_ADNKS_T38',
    version: '1.1',
    field: 'populationGrowthPerMille',
    level: 'ilce',
    rowFilter: { ADNKS_GOSTERGE: 'NUFUS_ARTIS_HIZ_YIL' },
  },
  {
    key: 'medianAge',
    dataflow: 'DF_ADNKS_T23',
    version: '1.1',
    field: 'medianAge',
    level: 'il',
    rowFilter: { ADNKS_GOSTERGE: 'ORTANCA_YAS', SEX: '_T' },
  },
  {
    key: 'household',
    dataflow: 'DF_ADNKS_T25',
    version: '1.1',
    field: 'avgHouseholdSize',
    level: 'il',
    rowFilter: { ADNKS_GOSTERGE: 'ORT_HH_BUYUKLUK' },
  },
]
