// TÜİK SDMX demografi — dataflow konfigürasyonu.
//
// TİPLER + SABİTLER spec'ten (2026-09-07-tuik-demografi-katmani-design.md rev 2).
// DATAFLOWS ve DATA_YEAR'ın gerçek değerleri Task 1 (SDMX introspection) tarafından
// doldurulur — TUIK_API_KEY gerektirir. O zamana kadar DATAFLOWS boş; crawl:tuik
// "datasets.ts boş" diyerek çıkar, kart tarafı etkilenmez (tablo boş kalır).

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
  /** Task 1 Step 2'de doğrulanmış — ör. "1.1" */
  version: string
  field: DemographicField
  /** T22/T38 ilçe; T23/T25 il (ilin tüm ilçelerine yayılır) */
  level: 'il' | 'ilce'
  /**
   * REF_AREA ve TIME_PERIOD dışı boyutlar için sabit filtre (DSD boyut sırasına
   * göre). Ör. medyan yaş T23 için { CINSIYET: '_T' }. Task 1 Step 2 DSD sırasını
   * doğrular. Boş obje = ek boyut yok / tüm boyutlar.
   */
  keyDimensions: Record<string, string>
}

/** DATA_YEAR: Task 1'de en güncel tam yıl doğrulanır. */
export const DATA_YEAR = 2024

/**
 * DATAFLOWS: Task 1 (SDMX introspection) doldurur. Beklenen 4 kayıt:
 *   population              → DF_ADNKS_T22, level 'ilce', keyDimensions {}
 *   populationGrowthPerMille → DF_ADNKS_T38, level 'ilce', keyDimensions {}
 *   medianAge               → DF_ADNKS_T23, level 'il',   keyDimensions { CINSIYET: '_T' }
 *   avgHouseholdSize        → DF_ADNKS_T25, level 'il',   keyDimensions {}
 * (versiyonlar Task 1 Step 2'de /rest/dataflow/.../latest ile doğrulanır)
 */
export const DATAFLOWS: DataflowRef[] = []
